'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasPortableData } from '@/lib/actions/portability-actions'

export async function acceptInvitation(
  token: string,
  userId: string,
  onboardingId: string
): Promise<{ error?: string; redirectTo?: string }> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Fetch the onboarding first — use admin client because the employee
  // doesn't own this onboarding yet (employee_id is still NULL), so RLS
  // would block a regular SELECT
  const { data: onboarding } = await adminClient
    .from('onboarding_instances')
    .select('employee_id, status, invitee_email, invitee_name')
    .eq('id', onboardingId)
    .single()

  if (!onboarding) return { error: 'not_found' }

  // Get or create employee profile for this user
  // Use admin client to bypass any RLS edge cases
  let { data: profile } = await adminClient
    .from('employee_profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  // Track whether this is a brand new profile (first-time employee)
  let isNewProfile = false

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
    isNewProfile = true
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

  // Decide where to send the employee next:
  // - New profile (just created) → straight to checklist, nothing to carry forward
  // - Existing profile with data → review page to carry forward portable items
  // - Existing profile but empty → straight to checklist
  let redirectTo = `/employee/onboarding/${onboardingId}`
  let debugHasData = 'not-checked'
  let debugError = 'none'

  if (!isNewProfile) {
    try {
      const hasData = await hasPortableData(userId)
      debugHasData = String(hasData)
      if (hasData) {
        redirectTo = `/employee/onboarding/${onboardingId}/review`
      }
    } catch (err: any) {
      debugError = err?.message || 'unknown error'
    }
  }

  // TEMPORARY DEBUG: encode the flow state into the redirect URL
  redirectTo += `?debug_new=${isNewProfile}&debug_hasdata=${debugHasData}&debug_err=${encodeURIComponent(debugError)}&debug_uid=${userId}`

  return { redirectTo }
}