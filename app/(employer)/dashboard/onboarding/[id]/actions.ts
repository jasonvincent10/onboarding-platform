'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptField } from '@/lib/encryption'
import { revalidatePath } from 'next/cache'

// ─── Fetch full onboarding for employer review ────────────────────────────────

export async function getOnboardingForReview(onboardingId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: member } = await supabase
    .from('employer_members')
    .select('employer_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'Not an employer' }

  const { data: instance, error: instanceError } = await supabase
    .from('onboarding_instances')
    .select('id, invitee_name, invitee_email, role_title, start_date, status, readiness_pct, employee_id')
    .eq('id', onboardingId)
    .eq('employer_id', member.employer_id)
    .single()

  if (instanceError || !instance) return { error: 'Onboarding not found' }

  const { data: items, error: itemsError } = await supabase
    .from('checklist_items')
    .select('id, item_name, item_type, data_category, status, deadline, document_upload_id, acknowledged_at, reviewed_by, reviewer_notes, was_pre_populated, description')
    .eq('onboarding_id', onboardingId)

  if (itemsError) return { error: 'Could not load checklist items' }

  return { instance, items: items ?? [] }
}

// ─── Generate a signed URL for a document upload ──────────────────────────────

export async function getSignedDocumentUrl(documentUploadId: string, onboardingId: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: member } = await supabase
    .from('employer_members')
    .select('employer_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'Not authorised' }

  const { data: instance } = await supabase
    .from('onboarding_instances')
    .select('id')
    .eq('id', onboardingId)
    .eq('employer_id', member.employer_id)
    .single()

  if (!instance) return { error: 'Not authorised' }

  const { data: doc } = await adminClient
    .from('document_uploads')
    .select('file_path')
    .eq('id', documentUploadId)
    .single()

  if (!doc) return { error: 'Document not found' }

  const { data: signed, error: signedError } = await adminClient.storage
    .from('employee-documents')
    .createSignedUrl(doc.file_path, 3600)

  if (signedError || !signed) {
    console.error('Signed URL error:', signedError)
    return { error: 'Could not generate document link' }
  }

  return { url: signed.signedUrl }
}

// ─── Decrypt and return form data for employer view ───────────────────────────

export async function getDecryptedFormData(onboardingId: string, dataCategory: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: member } = await supabase
    .from('employer_members')
    .select('employer_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'Not authorised' }

  const { data: instance } = await supabase
    .from('onboarding_instances')
    .select('employee_id')
    .eq('id', onboardingId)
    .eq('employer_id', member.employer_id)
    .single()

  if (!instance?.employee_id) return { error: 'Onboarding not found' }

  const { data: profile } = await adminClient
    .from('employee_profiles')
    .select('ni_number_encrypted, bank_sort_code_encrypted, bank_account_number_encrypted, bank_account_holder_name, emergency_contacts')
    .eq('id', instance.employee_id)
    .single()

  if (!profile) return { error: 'Employee profile not found' }

  if (dataCategory === 'ni_number') {
    if (!profile.ni_number_encrypted) return { fields: { 'NI Number': '(not yet submitted)' } }
    const ni = decryptField(profile.ni_number_encrypted)
    return { fields: { 'NI Number': ni } }
  }

  if (dataCategory === 'bank_details') {
    const sortCode = profile.bank_sort_code_encrypted ? decryptField(profile.bank_sort_code_encrypted) : null
    const accountNumber = profile.bank_account_number_encrypted ? decryptField(profile.bank_account_number_encrypted) : null
    return {
      fields: {
        'Account Holder': profile.bank_account_holder_name ?? '(not provided)',
        'Sort Code': sortCode ?? '(not submitted)',
        'Account Number': accountNumber ?? '(not submitted)',
      }
    }
  }

  if (dataCategory === 'emergency_contacts') {
    const contacts = profile.emergency_contacts as Array<{
      name: string; relationship: string; phone: string
    }> | null
    if (!contacts || contacts.length === 0) return { fields: { '': '(no contacts submitted)' } }
    const fields: Record<string, string> = {}
    contacts.forEach((c, i) => {
      fields[`Contact ${i + 1}`] = `${c.name} (${c.relationship}) — ${c.phone}`
    })
    return { fields }
  }

  return { error: 'Unknown data category' }
}

// ─── Approve a checklist item ─────────────────────────────────────────────────

export async function approveChecklistItem(checklistItemId: string, onboardingId: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: member } = await supabase
    .from('employer_members')
    .select('employer_id, id')
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'Not authorised' }

  const { data: instance } = await supabase
    .from('onboarding_instances')
    .select('id')
    .eq('id', onboardingId)
    .eq('employer_id', member.employer_id)
    .single()

  if (!instance) return { error: 'Not authorised' }

  const { error } = await adminClient
    .from('checklist_items')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewer_notes: null,
    })
    .eq('id', checklistItemId)

  if (error) {
    console.error('Approve error:', error)
    return { error: error.message }
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_type: 'employer',
    action: 'checklist_item_approved',
    resource_type: 'checklist_item',
    resource_id: checklistItemId,
    employer_id: member.employer_id,
    metadata: { onboarding_id: onboardingId },
  })

  revalidatePath(`/dashboard/onboarding/${onboardingId}`)
  return { success: true }
}

// ─── Request re-upload (mandatory note required) ──────────────────────────────

export async function requestReupload(checklistItemId: string, onboardingId: string, note: string) {
  if (!note.trim()) return { error: 'A note is required when requesting re-upload' }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: member } = await supabase
    .from('employer_members')
    .select('employer_id, id')
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'Not authorised' }

  const { data: instance } = await supabase
    .from('onboarding_instances')
    .select('id')
    .eq('id', onboardingId)
    .eq('employer_id', member.employer_id)
    .single()

  if (!instance) return { error: 'Not authorised' }

  const { error } = await adminClient
    .from('checklist_items')
    .update({
      status: 'not_started',
      reviewed_by: user.id,
      reviewer_notes: note.trim(),
      document_upload_id: null,
    })
    .eq('id', checklistItemId)

  if (error) return { error: 'Failed to request re-upload' }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_type: 'employer',
    action: 'checklist_item_reupload_requested',
    resource_type: 'checklist_item',
    resource_id: checklistItemId,
    employer_id: member.employer_id,
    metadata: { onboarding_id: onboardingId, note: note.trim() },
  })

  revalidatePath(`/dashboard/onboarding/${onboardingId}`)
  return { success: true }
}
