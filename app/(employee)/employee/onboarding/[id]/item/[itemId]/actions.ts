'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ChecklistItemWithUpload {
  id: string
  onboarding_id: string
  item_name: string
  description: string | null
  item_type: 'document_upload' | 'form_entry' | 'form' | 'acknowledgement'
  data_category: string
  form_field_key: string | null
  status: 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'overdue'
  deadline: string | null
  reviewer_notes: string | null
  acknowledged_at: string | null
  was_pre_populated: boolean
  document_upload_id: string | null
  policy_document_path: string | null
  document_uploads: {
    id: string
    document_type: string
    file_path: string
    verification_status: string
    expiry_date: string | null
    created_at: string
  } | null
}

export async function getChecklistItem(
  itemId: string,
  onboardingId: string
): Promise<ChecklistItemWithUpload | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('checklist_items')
    .select(`
      id,
      onboarding_id,
      item_name,
      description,
      item_type,
      data_category,
      form_field_key,
      status,
      deadline,
      reviewer_notes,
      acknowledged_at,
      was_pre_populated,
      document_upload_id,
      policy_document_path
    `)
    .eq('id', itemId)
    .eq('onboarding_id', onboardingId)
    .single()

  if (error || !data) {
    console.error('getChecklistItem failed:', error)
    return null
  }

  // Fetch the document upload separately if one is linked
  let document_uploads = null
  if (data.document_upload_id) {
    const { data: upload } = await supabase
      .from('document_uploads')
      .select(`
        id,
        document_type,
        file_path,
        verification_status,
        expiry_date,
        created_at
      `)
      .eq('id', data.document_upload_id)
      .single()

    document_uploads = upload
  }

  return { ...data, document_uploads } as ChecklistItemWithUpload
}

export async function getOnboardingContext(onboardingId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_instances')
    .select(
      `
      id,
      role_title,
      start_date,
      status,
      employer_accounts (
        company_name
      )
    `
    )
    .eq('id', onboardingId)
    .single()

  if (error || !data) return null
  return data
}

interface RecordUploadInput {
  onboardingId: string
  itemId: string
  filePath: string
  documentType: string
  dataCategory: string
  expiryDate?: string | null
}

export async function recordDocumentUpload(
  input: RecordUploadInput
): Promise<{ success: boolean; uploadId?: string; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated.' }
  }

  // Get the employee's profile
  const { data: profile, error: profileError } = await supabase
    .from('employee_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return { success: false, error: 'Employee profile not found.' }
  }

  // Verify this onboarding belongs to this employee
  const { data: onboarding, error: onboardingError } = await supabase
    .from('onboarding_instances')
    .select('id, employer_id')
    .eq('id', input.onboardingId)
    .eq('employee_id', profile.id)
    .single()

  if (onboardingError || !onboarding) {
    return { success: false, error: 'Onboarding not found.' }
  }

  // Insert document_uploads row (attached to employee profile, not onboarding)
  const { data: docUpload, error: uploadError } = await supabase
    .from('document_uploads')
    .insert({
      employee_id: profile.id,
      document_type: input.documentType,
      document_name: input.documentType,
      file_path: input.filePath,
      data_category: input.dataCategory,
      verification_status: 'pending',
      expiry_date: input.expiryDate || null,
    })
    .select('id')
    .single()

  if (uploadError || !docUpload) {
    return {
      success: false,
      error: uploadError?.message ?? 'Failed to record document.',
    }
  }

  // Link the document to the checklist item and mark submitted
  const { error: checklistError } = await supabase
    .from('checklist_items')
    .update({
      document_upload_id: docUpload.id,
      status: 'submitted',
    })
    .eq('id', input.itemId)
    .eq('onboarding_id', input.onboardingId)

  if (checklistError) {
    return { success: false, error: checklistError.message }
  }

  // Audit log
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_type: 'employee',
    action: 'document_uploaded',
    resource_type: 'document_upload',
    resource_id: docUpload.id,
    employer_id: onboarding.employer_id,
    employee_id: profile.id,
    metadata: {
      checklist_item_id: input.itemId,
      onboarding_id: input.onboardingId,
      document_type: input.documentType,
      data_category: input.dataCategory,
    },
  })

  revalidatePath(`/employee/onboarding/${input.onboardingId}`)
  revalidatePath(
    `/employee/onboarding/${input.onboardingId}/item/${input.itemId}`
  )

  return { success: true, uploadId: docUpload.id }
}

/**
 * Generates a short-lived signed URL server-side.
 * Used when the employer needs to view an employee's document.
 * This uses the server client (respects RLS) — the employee must have an
 * active onboarding with the employer AND active consent for the data category.
 */
export async function getDocumentSignedUrl(
  filePath: string
): Promise<{ url: string | null; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from('employee-documents')
    .createSignedUrl(filePath, 3600)

  if (error || !data) {
    return { url: null, error: error?.message }
  }

  return { url: data.signedUrl }
}