'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ============================================================================
// SECURITY MODEL
// ============================================================================
// This action is a public POST endpoint (all server actions are), so it must
// trust NOTHING from its arguments except the token itself:
//   - Identity comes from the session (supabase.auth.getUser), never a param.
//   - The onboarding is looked up BY TOKEN, so a caller cannot pass an
//     arbitrary onboardingId. If the token is wrong, nothing happens.
//   - Employer sessions are rejected outright. This closes the bug where an
//     employer clicking an invite link in the same browser silently created
//     an employee profile for their account and mis-claimed the onboarding
//     (the root cause of invite links "landing on the employer dashboard").
// ============================================================================

export async function acceptInvitation(
  token: string
): Promise<{ error?: string; redirectTo?: string; onboardingId?: string }> {
  if (!token) return { error: 'invalid_invite' }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Identity from the session ONLY.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  // Reject employer sessions. An employer member accepting an employee
  // invite is always a mistake in the MVP (usually same-browser testing).
  // If a genuine dual-role case ever appears, relax this to only block
  // members of the INVITING employer.
  const { data: employerMember } = await adminClient
    .from('employer_members')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (employerMember) return { error: 'employer_session' }

  // Look the onboarding up BY TOKEN -- the token is the credential here.
  // adminClient is required because the employee does not own this
  // onboarding yet (employee_id is still NULL), so RLS would block it.
  const { data: onboarding } = await adminClient
    .from('onboarding_instances')
    .select('id, employee_id, status, invitee_email, invitee_name')
    .eq('invitation_token', token)
    .maybeSingle()

  if (!onboarding) return { error: 'not_found' }
  if (onboarding.status === 'completed') return { error: 'already_completed' }

  const onboardingId = onboarding.id

  // Check if a profile already existed BEFORE the upsert, so we can tell
  // returning employees from new ones for the redirect decision below.
  const { data: existingProfile } = await adminClient
    .from('employee_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const isNewProfile = !existingProfile

  // Get or create the employee profile for the SESSION user.
  const { data: profile, error: profileError } = await adminClient
    .from('employee_profiles')
    .upsert(
      {
        user_id: user.id,
        email: user.email ?? '',
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

  // Onboarding already claimed by a different employee? Stop here.
  if (onboarding.employee_id && onboarding.employee_id !== profile.id) {
    return { error: 'already_claimed' }
  }

  // Note whether the accepting account's email differs from the invitee
  // email. Forwarded invites are legitimate (personal vs work address),
  // so this does not block -- but it IS recorded in the audit trail so an
  // employer can see it if a dispute ever arises.
  const emailMatchesInvite =
    (user.email ?? '').toLowerCase() === (onboarding.invitee_email ?? '').toLowerCase()

  // Claim the onboarding. Scoped by id AND token, and we verify a row was
  // actually updated -- a silent zero-row update must not report success.
  const { data: claimed, error: updateError } = await adminClient
    .from('onboarding_instances')
    .update({
      employee_id: profile.id,
      status: 'in_progress',
    })
    .eq('id', onboardingId)
    .eq('invitation_token', token)
    .select('id')

  if (updateError) {
    console.error('Onboarding update error:', updateError)
    return { error: 'update_failed' }
  }
  if (!claimed || claimed.length === 0) {
    return { error: 'update_failed' }
  }

  // Every employee goes to the consent gate before their checklist -- no
  // data is carried forward from a previous employer's onboarding. The
  // checklist itself also enforces a consent guard as a safety net.
  const redirectTo = `/employee/onboarding/${onboardingId}/consent`

  // Log the invitation acceptance event
  await adminClient.from('audit_log').insert({
    actor_id: user.id,
    actor_type: 'employee',
    action: 'invitation_accepted',
    resource_type: 'onboarding_instance',
    resource_id: onboardingId,
    employee_id: profile.id,
    metadata: {
      is_new_profile: isNewProfile,
      email_matches_invite: emailMatchesInvite,
    },
  })

  return { redirectTo, onboardingId }
}
