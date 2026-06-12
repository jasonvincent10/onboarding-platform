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

  // Mark the checklist item as submitted
  const { error: checklistError } = await adminClient
    .from('checklist_items')
    .update({
      status: 'submitted',
      document_upload_id: docUpload.id,
    })
    .eq('id', input.checklistItemId)

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
    // Non-fatal — checklist item is already submitted, log and continue
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