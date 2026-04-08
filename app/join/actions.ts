'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function acceptInvitation(
  token: string,
  userId: string,
  onboardingId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Fetch the onboarding first so we have invitee_name available
  const { data: onboarding } = await supabase
    .from('onboarding_instances')
    .select('employee_id, status, invitee_email, invitee_name')
    .eq('id', onboardingId)
    .single()

  if (!onboarding) return { error: 'not_found' }

  // Get or create employee profile for this user
  let { data: profile } = await supabase
    .from('employee_profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!profile) {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: newProfile, error: profileError } = await adminClient
      .from('employee_profiles')
      .insert({
        user_id: userId,
        email: user?.email ?? '',
        full_name: onboarding.invitee_name ?? '',
      })
      .select('id')
      .single()

    if (profileError || !newProfile) {
      console.error('Profile creation error:', profileError)
      return { error: 'profile_creation_failed' }
    }

    profile = newProfile
  }

  // Check onboarding isn't already claimed by a different employee
  if (onboarding.employee_id && onboarding.employee_id !== profile.id) {
    return { error: 'already_claimed' }
  }

  // Link the onboarding to this employee and move to in_progress
  const { error: updateError } = await adminClient
    .from('onboarding_instances')
    .update({
      employee_id: profile.id,
      status: 'in_progress',
    })
    .eq('id', onboardingId)
    .eq('invitation_token', token)

  if (updateError) {
    console.error('Onboarding update error:', updateError)
    return { error: 'update_failed' }
  }

  // Write audit log
  await adminClient.from('audit_log').insert({
    actor_id: userId,
    actor_type: 'employee',
    action: 'invitation_accepted',
    resource_type: 'onboarding_instance',
    resource_id: onboardingId,
    employee_id: profile.id,
    metadata: { token_used: true },
  })

  return {}
}
