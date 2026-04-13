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

  // Get or create employee profile for this user.
  // Use upsert on user_id (which has a unique constraint) so this works
  // whether the row was pre-created by a DB trigger, by an earlier run,
  // or not at all. This is the single source of truth for profile creation.
  const { data: { user } } = await supabase.auth.getUser()

  // Check if a profile already existed BEFORE we upsert, so we can tell
  // returning employees from new ones for the redirect decision below.
  const { data: existingProfile } = await adminClient
    .from('employee_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  const isNewProfile = !existingProfile

  const { data: profile, error: profileError } = await adminClient
    .from('employee_profiles')
    .upsert(
      {
        user_id: userId,
        email: user?.email ?? '',
        full_name: onboarding.invitee_name ?? '',
      },
      { onConflict: 'user_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (profileError || !profile) {
    console.error('Profile creation error:', profileError)
    return { error: 'profile_creation_failed' }
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

  // Decide where to send the employee next.
  // - Returning employee with portable data → /review (consent + confirm in one)
  // - Everyone else (new profile, or returning with no usable data) → /consent gate
  // The checklist itself also enforces a consent guard as a safety net.
  let redirectTo = `/employee/onboarding/${onboardingId}/consent`

  if (!isNewProfile) {
    try {
      const hasData = await hasPortableData(userId)
      if (hasData) {
        redirectTo = `/employee/onboarding/${onboardingId}/review`
      }
    } catch (err) {
      // If the portability check fails, fall back to the consent gate.
      // Safer to re-ask for consent than to skip it on a transient error.
      console.error('hasPortableData check failed:', err)
    }
  }

  // Log the invitation acceptance event
  await adminClient.from('audit_log').insert({
    actor_id: userId,
    actor_type: 'employee',
    action: 'invitation_accepted',
    resource_type: 'onboarding_instance',
    resource_id: onboardingId,
    employee_id: profile.id,
    metadata: {
      is_new_profile: isNewProfile,
    },
  })

  return { redirectTo }
}