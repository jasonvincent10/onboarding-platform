'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function acknowledgePolicy(
  checklistItemId: string,
  onboardingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Not authenticated' }

  // Get checklist item and verify ownership via onboarding
  const { data: item, error: itemError } = await supabase
    .from('checklist_items')
    .select('id, item_type, data_category, status, onboarding_id')
    .eq('id', checklistItemId)
    .eq('onboarding_id', onboardingId)
    .single()

  if (itemError || !item) return { success: false, error: 'Checklist item not found' }
  if (item.item_type !== 'acknowledgement') return { success: false, error: 'Item is not an acknowledgement type' }
  if (item.status === 'approved' || item.status === 'submitted') {
    return { success: false, error: 'Already acknowledged' }
  }

  // Get the onboarding instance to retrieve employer_id and employee_id
  const { data: onboarding, error: onboardingError } = await supabase
    .from('onboarding_instances')
    .select('id, employer_id, employee_id')
    .eq('id', onboardingId)
    .single()

  if (onboardingError || !onboarding) return { success: false, error: 'Onboarding not found' }

  // Get employee profile id
  const { data: profile, error: profileError } = await supabase
    .from('employee_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) return { success: false, error: 'Employee profile not found' }

  // 1. Update checklist item — mark as submitted with acknowledged_at timestamp
  const { error: updateError } = await adminClient
    .from('checklist_items')
    .update({
      status: 'submitted',
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', checklistItemId)

  if (updateError) return { success: false, error: 'Failed to record acknowledgement' }

  // 2. Insert consent record (append-only)
  const { error: consentError } = await adminClient
    .from('consent_records')
    .insert({
      employee_id: profile.id,
      employer_id: onboarding.employer_id,
      data_category: item.data_category,
      action: 'granted',
      onboarding_id: onboardingId,
    })

  if (consentError) {
    console.error('Consent record insert failed:', consentError)
    // Non-fatal — acknowledgement already recorded, log and continue
  }

  // 3. Write audit log
  await adminClient.from('audit_log').insert({
    actor_id: user.id,
    actor_type: 'employee',
    action: 'policy_acknowledged',
    resource_type: 'checklist_item',
    resource_id: checklistItemId,
    employer_id: onboarding.employer_id,
    employee_id: profile.id,
    metadata: {
      onboarding_id: onboardingId,
      data_category: item.data_category,
    },
  })

  revalidatePath(`/employee/onboarding/${onboardingId}`)
  revalidatePath(`/employee/onboarding/${onboardingId}/item/${checklistItemId}`)

  return { success: true }
}