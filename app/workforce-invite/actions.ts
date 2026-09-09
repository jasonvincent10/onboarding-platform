'use server'

// ============================================================================
// SECURITY MODEL: mirrors app/join/actions.ts. The employment is looked up BY
// TOKEN with adminClient (the caller does not own it yet); identity for the
// claim ALWAYS comes from the session. Employer sessions are rejected, as
// they are for onboarding invites.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAudit } from '@/lib/compliance/audit'

async function getEmploymentByToken(token: string) {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('employments')
    .select('id, employer_id, employee_id, full_name, email, status')
    .eq('invitation_token', token)
    .maybeSingle()
  return data
}

export async function acceptWorkforceInvite(token: string): Promise<{ error?: string; redirectTo?: string }> {
  if (!token) return { error: 'invalid_invite' }

  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  const { data: employerMember } = await adminClient.from('employer_members').select('id').eq('user_id', user.id).maybeSingle()
  if (employerMember) return { error: 'employer_session' }

  const employment = await getEmploymentByToken(token)
  if (!employment) return { error: 'not_found' }
  if (employment.status !== 'active') return { error: 'not_active' }

  const { data: existingProfile } = await adminClient.from('employee_profiles').select('id').eq('user_id', user.id).maybeSingle()
  const { data: profile, error: profileError } = await adminClient
    .from('employee_profiles')
    .upsert({ user_id: user.id, email: user.email ?? '', full_name: (user.user_metadata?.full_name as string) || employment.full_name }, { onConflict: 'user_id', ignoreDuplicates: false })
    .select('id')
    .single()
  if (profileError || !profile) return { error: 'profile_creation_failed' }

  if (employment.employee_id && employment.employee_id !== profile.id) return { error: 'already_claimed' }

  if (!employment.employee_id) {
    const { data: claimed, error } = await adminClient
      .from('employments')
      .update({ employee_id: profile.id })
      .eq('id', employment.id)
      .eq('invitation_token', token)
      .is('employee_id', null)
      .select('id')
    if (error) return { error: error.message.includes('uq_employments_active_employee') ? 'already_on_workforce' : 'update_failed' }
    if (!claimed || claimed.length === 0) return { error: 'update_failed' }

    await writeAudit({
      actorId: user.id,
      actorType: 'employee',
      action: 'workforce_invite_accepted',
      resourceType: 'employments',
      resourceId: employment.id,
      employerId: employment.employer_id,
      employeeId: profile.id,
      metadata: { is_new_profile: !existingProfile, email_matches_invite: (user.email ?? '').toLowerCase() === (employment.email ?? '').toLowerCase() },
    })
  }

  return { redirectTo: '/employee/compliance' }
}

export async function signUpForWorkforceInvite(token: string, formData: FormData): Promise<{ error?: string; redirectTo?: string }> {
  const employment = await getEmploymentByToken(token)
  if (!employment || employment.status !== 'active' || !employment.email) return { error: 'This invitation is no longer valid.' }

  const password = formData.get('password') as string
  const fullName = (formData.get('full_name') as string)?.trim()
  if (!fullName) return { error: 'Please enter your name.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: employment.email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) {
    if (error.message.toLowerCase().includes('already')) return { error: 'An account with this email already exists. Sign in instead.' }
    return { error: error.message }
  }
  return acceptWorkforceInvite(token)
}

export async function loginForWorkforceInvite(token: string, formData: FormData): Promise<{ error?: string; redirectTo?: string }> {
  const employment = await getEmploymentByToken(token)
  if (!employment || employment.status !== 'active') return { error: 'This invitation is no longer valid.' }

  const email = ((formData.get('email') as string) || employment.email || '').trim().toLowerCase()
  const password = formData.get('password') as string
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Incorrect email or password.' }
  return acceptWorkforceInvite(token)
}
