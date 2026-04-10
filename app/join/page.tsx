import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { acceptInvitation } from './actions'

interface JoinPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const { token } = await searchParams

  // DEBUG STAGE 1: page entered
  const debugAdminClient = createAdminClient()
  await debugAdminClient.from('audit_log').insert({
    actor_id: '00000000-0000-0000-0000-000000000000',
    actor_type: 'employee',
    action: 'invitation_accepted',
    resource_type: 'onboarding_instance',
    resource_id: '00000000-0000-0000-0000-000000000000',
    metadata: {
      DEBUG_TAG: 'join_page_entered',
      token: token || 'none',
    },
  })

  if (token === 'PROVE_JOIN_RAN') {
    redirect('/employee/dashboard?join_page_ran=yes')
  }

  if (!token) {
    redirect('/auth/login?error=invalid_invite')
  }

  const adminClient = createAdminClient()

  const { data: onboarding, error } = await adminClient
    .from('onboarding_instances')
    .select('id, invitee_name, invitee_email, role_title, status, employer_accounts(company_name)')
    .eq('invitation_token', token)
    .single()

  // DEBUG STAGE 2: after onboarding lookup
  await debugAdminClient.from('audit_log').insert({
    actor_id: '00000000-0000-0000-0000-000000000000',
    actor_type: 'employee',
    action: 'invitation_accepted',
    resource_type: 'onboarding_instance',
    resource_id: '00000000-0000-0000-0000-000000000000',
    metadata: {
      DEBUG_TAG: 'join_after_onboarding_lookup',
      token: token || 'none',
      foundOnboarding: !!onboarding,
      lookupError: error?.message || 'none',
      status: onboarding?.status || 'none',
    },
  })

  if (error || !onboarding) {
    redirect('/auth/login?error=invalid_invite')
  }

  if (onboarding.status === 'completed') {
    redirect('/employee/dashboard?notice=already_completed')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // DEBUG STAGE 3: after auth check
  await debugAdminClient.from('audit_log').insert({
    actor_id: user?.id || '00000000-0000-0000-0000-000000000000',
    actor_type: 'employee',
    action: 'invitation_accepted',
    resource_type: 'onboarding_instance',
    resource_id: onboarding.id,
    metadata: {
      DEBUG_TAG: 'join_after_auth_check',
      hasUser: !!user,
      userId: user?.id || 'none',
    },
  })

  if (!user) {
    redirect(`/employee-login?token=${token}`)
  }

  // DEBUG STAGE 4: about to call acceptInvitation
  await debugAdminClient.from('audit_log').insert({
    actor_id: user.id,
    actor_type: 'employee',
    action: 'invitation_accepted',
    resource_type: 'onboarding_instance',
    resource_id: onboarding.id,
    metadata: {
      DEBUG_TAG: 'join_before_accept_call',
      userId: user.id,
      onboardingId: onboarding.id,
    },
  })

  const result = await acceptInvitation(token, user.id, onboarding.id)

  // DEBUG STAGE 5: after acceptInvitation returned
  await debugAdminClient.from('audit_log').insert({
    actor_id: user.id,
    actor_type: 'employee',
    action: 'invitation_accepted',
    resource_type: 'onboarding_instance',
    resource_id: onboarding.id,
    metadata: {
      DEBUG_TAG: 'join_after_accept_call',
      resultError: result.error || 'none',
      resultRedirect: result.redirectTo || 'none',
    },
  })

  if (result.error) {
    redirect(`/employee/dashboard?error=${result.error}`)
  }

  redirect(result.redirectTo || `/employee/onboarding/${onboarding.id}?welcomed=true`)
}