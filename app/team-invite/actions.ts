'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ============================================================================
// SECURITY MODEL
// ============================================================================
// Mirrors app/join/actions.ts (onboarding invites): the token is looked up
// by adminClient (the caller isn't a member yet, so RLS would block it), but
// identity for the actual accept step ALWAYS comes from the session
// (supabase.auth.getUser), never from a param. A caller cannot pass an
// arbitrary employer_id or user_id and have it honoured.
// ============================================================================

async function getInvitationByToken(token: string) {
  const adminClient = createAdminClient()
  const { data: invitation } = await adminClient
    .from('employer_invitations')
    .select('id, employer_id, email, role, status')
    .eq('invitation_token', token)
    .maybeSingle()
  return invitation
}

export async function acceptTeamInvitation(
  token: string
): Promise<{ error?: string; redirectTo?: string }> {
  if (!token) return { error: 'invalid_invite' }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  const invitation = await getInvitationByToken(token)
  if (!invitation) return { error: 'not_found' }
  if (invitation.status === 'revoked') return { error: 'revoked' }

  const sessionEmail = (user.email ?? '').toLowerCase()
  const inviteEmail = invitation.email.toLowerCase()
  if (sessionEmail !== inviteEmail) {
    return { error: 'email_mismatch' }
  }

  // Already an employer_member somewhere? The rest of this app assumes one
  // employer per user (dashboard/layout.tsx does .maybeSingle() on this
  // lookup) -- joining a second, different employer would put the account
  // into a state nothing else here handles correctly.
  const { data: existingMembership } = await adminClient
    .from('employer_members')
    .select('id, employer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingMembership && existingMembership.employer_id !== invitation.employer_id) {
    return { error: 'already_on_another_team' }
  }

  if (existingMembership) {
    // Re-clicking a link after already joining -- idempotent, not an error.
    if (invitation.status === 'pending') {
      await adminClient
        .from('employer_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)
    }
    return { redirectTo: '/dashboard' }
  }

  if (invitation.status === 'accepted') {
    return { error: 'already_accepted' }
  }

  const fullName = (user.user_metadata?.full_name as string) || user.email || 'Team member'

  const { error: memberError } = await adminClient.from('employer_members').insert({
    employer_id: invitation.employer_id,
    user_id: user.id,
    role: invitation.role,
    full_name: fullName,
    email: user.email,
  })

  if (memberError) {
    console.error('employer_members insert failed:', memberError)
    return { error: 'join_failed' }
  }

  await adminClient
    .from('employer_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  await adminClient.from('audit_log').insert({
    actor_id: user.id,
    actor_type: 'employer',
    action: 'team_member_joined',
    resource_type: 'employer_members',
    resource_id: invitation.employer_id,
    employer_id: invitation.employer_id,
    metadata: { invitation_id: invitation.id },
  })

  return { redirectTo: '/dashboard' }
}

export async function signUpForTeamInvite(
  token: string,
  formData: FormData
): Promise<{ error?: string; redirectTo?: string }> {
  const invitation = await getInvitationByToken(token)
  if (!invitation || invitation.status !== 'pending') return { error: 'invalid_or_expired' }

  const password = formData.get('password') as string
  const fullName = (formData.get('full_name') as string)?.trim()

  if (!fullName) return { error: 'Please enter your name.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: invitation.email,
    password,
    options: { data: { full_name: fullName, user_type: 'employer' } },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { error: 'An account with this email already exists. Sign in instead.' }
    }
    return { error: error.message }
  }

  return acceptTeamInvitation(token)
}

export async function loginForTeamInvite(
  token: string,
  formData: FormData
): Promise<{ error?: string; redirectTo?: string }> {
  const invitation = await getInvitationByToken(token)
  if (!invitation || invitation.status !== 'pending') return { error: 'invalid_or_expired' }

  const password = formData.get('password') as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: invitation.email,
    password,
  })

  if (error) return { error: 'Incorrect password.' }

  return acceptTeamInvitation(token)
}
