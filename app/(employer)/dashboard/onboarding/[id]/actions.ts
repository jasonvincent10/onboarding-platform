'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptField } from '@/lib/encryption'
import { revalidatePath } from 'next/cache'

// ============================================================================
// SECURITY MODEL FOR THIS FILE (read before editing)
// ============================================================================
// Every action here uses adminClient for reads/writes that RLS would block.
// Because adminClient bypasses RLS entirely, EVERY action must do three
// things in application code before touching data:
//   1. Verify the caller is an authenticated employer member
//   2. Verify the onboarding belongs to that employer
//   3. Verify the specific resource (document / checklist item / profile)
//      belongs to THAT onboarding -- never trust a bare resource ID
// For document and decrypted-field access there is a fourth requirement:
//   4. Verify the employee has ACTIVE consent for the data category.
//      Consent withdrawal must actually cut off access, or the consent
//      system is cosmetic and the GDPR posture is false.
// ============================================================================

// --- Shared helpers ----------------------------------------------------------

interface EmployerContext {
  userId: string
  employerId: string
  employeeId: string | null
}

/**
 * Verifies the caller is an employer member AND owns the onboarding.
 * Returns null if either check fails. All actions in this file must call
 * this before doing anything with adminClient.
 */
async function getVerifiedEmployerContext(
  onboardingId: string
): Promise<EmployerContext | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('employer_members')
    .select('employer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return null

  const { data: instance } = await supabase
    .from('onboarding_instances')
    .select('id, employee_id')
    .eq('id', onboardingId)
    .eq('employer_id', member.employer_id)
    .maybeSingle()

  if (!instance) return null

  return {
    userId: user.id,
    employerId: member.employer_id,
    employeeId: instance.employee_id ?? null,
  }
}

/**
 * Checks the latest consent_records row for (employee, employer, category).
 * Queried via adminClient directly (rather than the RPC helper) so the check
 * cannot silently pass on an RPC permission error -- no row or a 'withdrawn'
 * row both mean NO ACCESS.
 */
async function hasActiveConsentAdmin(
  employeeId: string,
  employerId: string,
  dataCategory: string
): Promise<boolean> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('consent_records')
    .select('action')
    .eq('employee_id', employeeId)
    .eq('employer_id', employerId)
    .eq('data_category', dataCategory)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Consent lookup error:', error)
    return false // fail closed
  }
  return data?.action === 'granted'
}

// --- Fetch full onboarding for employer review --------------------------------

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

// --- Generate a signed URL for a document upload ------------------------------

export async function getSignedDocumentUrl(documentUploadId: string, onboardingId: string) {
  const ctx = await getVerifiedEmployerContext(onboardingId)
  if (!ctx) return { error: 'Not authorised' }
  if (!ctx.employeeId) return { error: 'Onboarding has no linked employee yet' }

  const adminClient = createAdminClient()

  // Fetch the document WITH its owner and category so we can verify both.
  const { data: doc } = await adminClient
    .from('document_uploads')
    .select('file_path, employee_id, data_category')
    .eq('id', documentUploadId)
    .maybeSingle()

  if (!doc) return { error: 'Document not found' }

  // SECURITY: the document must belong to the employee on THIS onboarding.
  // Without this check any employer could sign a URL for any document in
  // the system by passing an arbitrary documentUploadId.
  if (doc.employee_id !== ctx.employeeId) {
    return { error: 'Not authorised' }
  }

  // GDPR: active consent for this data category is required. This mirrors
  // the RLS SELECT policy that adminClient bypasses.
  const consented = await hasActiveConsentAdmin(
    ctx.employeeId,
    ctx.employerId,
    doc.data_category
  )
  if (!consented) {
    return { error: 'The employee has not granted (or has withdrawn) consent for this document category' }
  }

  const { data: signed, error: signedError } = await adminClient.storage
    .from('employee-documents')
    .createSignedUrl(doc.file_path, 3600)

  if (signedError || !signed) {
    console.error('Signed URL error:', signedError)
    return { error: 'Could not generate document link' }
  }

  const supabase = await createClient()
  await supabase.from('audit_log').insert({
    actor_id: ctx.userId,
    actor_type: 'employer',
    action: 'document_viewed',
    resource_type: 'document_upload',
    resource_id: documentUploadId,
    employer_id: ctx.employerId,
    employee_id: ctx.employeeId,
    metadata: { onboarding_id: onboardingId, data_category: doc.data_category },
  })

  return { url: signed.signedUrl }
}

// --- Decrypt and return form data for employer view ---------------------------

export async function getDecryptedFormData(onboardingId: string, dataCategory: string) {
  const ctx = await getVerifiedEmployerContext(onboardingId)
  if (!ctx) return { error: 'Not authorised' }
  if (!ctx.employeeId) return { error: 'Onboarding has no linked employee yet' }

  // GDPR: consent gate BEFORE any decryption. If the employee withdraws
  // consent on their consents page, this is the line that makes the
  // withdrawal real.
  const consented = await hasActiveConsentAdmin(ctx.employeeId, ctx.employerId, dataCategory)
  if (!consented) {
    return { error: 'The employee has not granted (or has withdrawn) consent for this data' }
  }

  const adminClient = createAdminClient()
  const supabase = await createClient()

  const { data: profile } = await adminClient
    .from('employee_profiles')
    .select('ni_number_encrypted, bank_sort_code_encrypted, bank_account_number_encrypted, bank_account_holder_name, emergency_contacts')
    .eq('id', ctx.employeeId)
    .single()

  if (!profile) return { error: 'Employee profile not found' }

  const writeAccessAudit = async () => {
    await supabase.from('audit_log').insert({
      actor_id: ctx.userId,
      actor_type: 'employer',
      action: 'profile_accessed',
      resource_type: 'employee_profile',
      resource_id: ctx.employeeId,
      employer_id: ctx.employerId,
      employee_id: ctx.employeeId,
      metadata: { onboarding_id: onboardingId, data_category: dataCategory },
    })
  }

  if (dataCategory === 'ni_number') {
    if (!profile.ni_number_encrypted) return { fields: { 'NI Number': '(not yet submitted)' } }
    const ni = decryptField(profile.ni_number_encrypted)
    await writeAccessAudit()
    return { fields: { 'NI Number': ni } }
  }

  if (dataCategory === 'bank_details') {
    const sortCode = profile.bank_sort_code_encrypted ? decryptField(profile.bank_sort_code_encrypted) : null
    const accountNumber = profile.bank_account_number_encrypted ? decryptField(profile.bank_account_number_encrypted) : null
    await writeAccessAudit()
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
      fields[`Contact ${i + 1}`] = `${c.name} (${c.relationship}) and ${c.phone}`
    })
    await writeAccessAudit()
    return { fields }
  }

  return { error: 'Unknown data category' }
}

// --- Approve a checklist item --------------------------------------------------

export async function approveChecklistItem(checklistItemId: string, onboardingId: string) {
  const ctx = await getVerifiedEmployerContext(onboardingId)
  if (!ctx) return { error: 'Not authorised' }

  const adminClient = createAdminClient()

  // SECURITY: the update is scoped to BOTH the item id AND the verified
  // onboarding id. Without the second .eq an employer could approve any
  // checklist item in the system. .select('id') tells us whether a row
  // actually matched -- zero rows means the item was not on this onboarding.
  const { data: updated, error } = await adminClient
    .from('checklist_items')
    .update({
      status: 'approved',
      reviewed_by: ctx.userId,
      reviewer_notes: null,
    })
    .eq('id', checklistItemId)
    .eq('onboarding_id', onboardingId)
    .select('id')

  if (error) {
    console.error('Approve error:', error)
    return { error: error.message }
  }
  if (!updated || updated.length === 0) {
    return { error: 'Not authorised' }
  }

  const supabase = await createClient()
  await supabase.from('audit_log').insert({
    actor_id: ctx.userId,
    actor_type: 'employer',
    action: 'checklist_item_approved',
    resource_type: 'checklist_item',
    resource_id: checklistItemId,
    employer_id: ctx.employerId,
    metadata: { onboarding_id: onboardingId },
  })

  revalidatePath(`/dashboard/onboarding/${onboardingId}`)
  return { success: true }
}

// --- Request re-upload (mandatory note required) --------------------------------

export async function requestReupload(checklistItemId: string, onboardingId: string, note: string) {
  if (!note.trim()) return { error: 'A note is required when requesting re-upload' }

  const ctx = await getVerifiedEmployerContext(onboardingId)
  if (!ctx) return { error: 'Not authorised' }

  const adminClient = createAdminClient()

  const { data: updated, error } = await adminClient
    .from('checklist_items')
    .update({
      status: 'not_started',
      reviewed_by: ctx.userId,
      reviewer_notes: note.trim(),
      document_upload_id: null,
    })
    .eq('id', checklistItemId)
    .eq('onboarding_id', onboardingId)
    .select('id')

  if (error) return { error: 'Failed to request re-upload' }
  if (!updated || updated.length === 0) {
    return { error: 'Not authorised' }
  }

  const supabase = await createClient()
  await supabase.from('audit_log').insert({
    actor_id: ctx.userId,
    actor_type: 'employer',
    action: 'checklist_item_rejected',
    resource_type: 'checklist_item',
    resource_id: checklistItemId,
    employer_id: ctx.employerId,
    metadata: { onboarding_id: onboardingId, note: note.trim() },
  })

  revalidatePath(`/dashboard/onboarding/${onboardingId}`)
  return { success: true }
}
