import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Vercel sends CRON_SECRET as a Bearer token — reject anything else
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Fetch all onboardings that are still active
  const { data: activeOnboardings, error: fetchError } = await supabase
    .from('onboarding_instances')
    .select('id')
    .in('status', ['pending', 'in_progress'])

  if (fetchError) {
    console.error('[cron/check-overdue] fetch error:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const ids = activeOnboardings?.map((o) => o.id) ?? []

  let processed = 0
  let errors = 0

  for (const id of ids) {
    const { error: rpcError } = await supabase.rpc('recalculate_onboarding_status', {
      p_onboarding_id: id,
    })
    if (rpcError) {
      console.error(`[cron/check-overdue] failed for onboarding ${id}:`, rpcError)
      errors++
    } else {
      processed++
    }
  }

  console.log(`[cron/check-overdue] done — processed: ${processed}, errors: ${errors}`)

  const purged = await purgeRejectedCandidates(supabase)

  return NextResponse.json({ processed, errors, purged })
}

// ─── Purge rejected candidates' data, 7 days after rejection ──────────────
//
// Confirmed/complete onboardings are never touched here -- only ones an
// employer explicitly rejected. audit_log is append-only with FKs that have
// no cascade rule, so this does NOT delete onboarding_instances or
// employee_profiles rows -- it deletes the sensitive CONTENT (documents in
// Storage + document_uploads rows, encrypted profile fields) and marks the
// onboarding purged, leaving a minimal historical record. This is what
// GDPR's right-to-erasure allows for (Article 17(3)).
async function purgeRejectedCandidates(
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ onboardingsPurged: number; documentsDeleted: number; errors: number }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: due, error: fetchError } = await supabase
    .from('onboarding_instances')
    .select('id, employer_id, employee_id, invitee_name, invitee_email')
    .eq('status', 'rejected')
    .is('data_purged_at', null)
    .lte('rejected_at', sevenDaysAgo)

  if (fetchError) {
    console.error('[cron/check-overdue] purge fetch error:', fetchError)
    return { onboardingsPurged: 0, documentsDeleted: 0, errors: 1 }
  }

  let onboardingsPurged = 0
  let documentsDeleted = 0
  let errors = 0

  for (const onboarding of due ?? []) {
    try {
      const { data: items } = await supabase
        .from('checklist_items')
        .select('id, document_upload_id')
        .eq('onboarding_id', onboarding.id)

      const documentIds = [...new Set((items ?? []).map((i) => i.document_upload_id).filter(Boolean))] as string[]

      for (const docId of documentIds) {
        // A document can be referenced by checklist items on a DIFFERENT
        // onboarding for the same employee -- never delete a document still
        // in use elsewhere.
        const { data: elsewhere } = await supabase
          .from('checklist_items')
          .select('id')
          .eq('document_upload_id', docId)
          .neq('onboarding_id', onboarding.id)
          .limit(1)

        if (elsewhere && elsewhere.length > 0) continue

        const { data: doc } = await supabase
          .from('document_uploads')
          .select('file_path')
          .eq('id', docId)
          .maybeSingle()

        if (doc && !doc.file_path.startsWith('share_code:')) {
          const { error: storageError } = await supabase.storage
            .from('employee-documents')
            .remove([doc.file_path])
          if (storageError) {
            console.error(`[cron/check-overdue] storage removal failed for ${docId}:`, storageError)
          }
        }

        await supabase.from('document_uploads').delete().eq('id', docId)
        documentsDeleted++
      }

      // Clear dangling references now that the documents are gone.
      await supabase
        .from('checklist_items')
        .update({ document_upload_id: null })
        .eq('onboarding_id', onboarding.id)

      // Only clear the employee's shared profile fields if no OTHER
      // onboarding still needs them (they're shared across onboardings).
      if (onboarding.employee_id) {
        const { data: otherOnboardings } = await supabase
          .from('onboarding_instances')
          .select('id')
          .eq('employee_id', onboarding.employee_id)
          .neq('id', onboarding.id)
          .limit(1)

        if (!otherOnboardings || otherOnboardings.length === 0) {
          await supabase
            .from('employee_profiles')
            .update({
              date_of_birth: null,
              address_line_1: null,
              address_line_2: null,
              city: null,
              postcode: null,
              phone: null,
              ni_number_encrypted: null,
              bank_account_name: null,
              bank_sort_code_encrypted: null,
              bank_account_number_encrypted: null,
              bank_building_society_ref: null,
              emergency_contacts: [],
              right_to_work_status: null,
              right_to_work_expiry: null,
            })
            .eq('id', onboarding.employee_id)
        }
      }

      await supabase.from('onboarding_instances').update({ data_purged_at: new Date().toISOString() }).eq('id', onboarding.id)

      await supabase.from('audit_log').insert({
        actor_id: null,
        actor_type: 'system',
        action: 'candidate_data_purged',
        resource_type: 'onboarding_instance',
        resource_id: onboarding.id,
        employer_id: onboarding.employer_id,
        employee_id: onboarding.employee_id,
        onboarding_id: onboarding.id,
        metadata: { invitee_name: onboarding.invitee_name, invitee_email: onboarding.invitee_email },
      })

      onboardingsPurged++
    } catch (err) {
      console.error(`[cron/check-overdue] purge failed for onboarding ${onboarding.id}:`, err)
      errors++
    }
  }

  console.log(`[cron/check-overdue] purge done — onboardings: ${onboardingsPurged}, documents: ${documentsDeleted}, errors: ${errors}`)
  return { onboardingsPurged, documentsDeleted, errors }
}