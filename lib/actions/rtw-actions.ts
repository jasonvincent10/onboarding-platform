'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface SubmitRightToWorkInput {
  checklistItemId: string
  onboardingId: string
  documentType: string
  filePath?: string
  shareCode?: string
  expiryDate?: string | null
}

export async function submitRightToWork(
  input: SubmitRightToWorkInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('employee_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return { success: false, error: 'Employee profile not found' }

  // ==========================================================================
  // SECURITY: verify ownership BEFORE any adminClient write.
  // 1. The checklist item must belong to the onboarding the caller named.
  // 2. That onboarding must belong to THIS employee.
  // Without these checks any logged-in employee could mark any checklist
  // item in the system as submitted and attach their own document to it.
  // ==========================================================================
  const { data: item } = await adminClient
    .from('checklist_items')
    .select('id, onboarding_id')
    .eq('id', input.checklistItemId)
    .eq('onboarding_id', input.onboardingId)
    .maybeSingle()

  if (!item) return { success: false, error: 'Checklist item not found' }

  const { data: onboarding } = await adminClient
    .from('onboarding_instances')
    .select('id, employee_id')
    .eq('id', input.onboardingId)
    .maybeSingle()

  if (!onboarding || onboarding.employee_id !== profile.id) {
    return { success: false, error: 'Not authorised' }
  }

  // Share codes are stored with a prefix convention instead of a storage path
  const storagePath = input.shareCode
    ? `share_code:${input.shareCode}`
    : (input.filePath ?? '')

  if (!storagePath) return { success: false, error: 'No document provided' }

  // Create the document_uploads row
  const documentName = input.shareCode
    ? 'Right to work share code'
    : (input.filePath?.split('/').pop() ?? input.documentType)

  const { data: docUpload, error: uploadError } = await adminClient
    .from('document_uploads')
    .insert({
      employee_id: profile.id,
      document_type: input.documentType,
      document_name: documentName,
      file_path: storagePath,
      data_category: 'right_to_work',
      verification_status: 'pending',
      expiry_date: input.expiryDate ?? null,
    })
    .select('id')
    .single()

  if (uploadError || !docUpload) {
    console.error('RTW document_uploads insert error:', uploadError)
    return { success: false, error: 'Failed to save document record' }
  }

  // Mark the checklist item as submitted -- scoped to the verified onboarding
  const { error: checklistError } = await adminClient
    .from('checklist_items')
    .update({
      status: 'submitted',
      document_upload_id: docUpload.id,
    })
    .eq('id', input.checklistItemId)
    .eq('onboarding_id', input.onboardingId)

  if (checklistError) {
    console.error('RTW checklist_items update error:', checklistError)
    return { success: false, error: 'Failed to update checklist item' }
  }

  // Update the employee profile RTW fields
  const profileUpdate: { right_to_work_status: string; right_to_work_expiry?: string } = {
    right_to_work_status: 'submitted',
  }
  if (input.expiryDate) {
    profileUpdate.right_to_work_expiry = input.expiryDate
  }

  const { error: profileError } = await adminClient
    .from('employee_profiles')
    .update(profileUpdate)
    .eq('id', profile.id)

  if (profileError) {
    // Non-fatal -- checklist item is already submitted, log and continue
    console.error('RTW employee_profiles update error:', profileError)
  }

  // Audit log
  await adminClient.from('audit_log').insert({
    actor_id: user.id,
    actor_type: 'employee',
    action: 'document_uploaded',
    resource_type: 'document_uploads',
    resource_id: docUpload.id,
    employee_id: profile.id,
    metadata: {
      document_type: input.documentType,
      checklist_item_id: input.checklistItemId,
      onboarding_id: input.onboardingId,
      is_share_code: !!input.shareCode,
      has_expiry: !!input.expiryDate,
    },
  })

  return { success: true }
}
