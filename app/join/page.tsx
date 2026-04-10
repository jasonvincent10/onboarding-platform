import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { acceptInvitation } from './actions'

interface JoinPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const { token } = await searchParams

  // DEBUG: this redirect should fire if the join page is even running
  if (token === 'PROVE_JOIN_RAN') {
    redirect('/employee/dashboard?join_page_ran=yes')
  }

  if (!token) {
    redirect('/auth/login?error=invalid_invite')
  }

  // Use admin client to look up the onboarding by token — bypasses RLS
  // so unauthenticated visitors can validate the invite link before logging in
  const adminClient = createAdminClient()

  const { data: onboarding, error } = await adminClient
    .from('onboarding_instances')
    .select('id, invitee_name, invitee_email, role_title, status, employer_accounts(company_name)')
    .eq('invitation_token', token)
    .single()

  if (error || !onboarding) {
    redirect('/auth/login?error=invalid_invite')
  }

  if (onboarding.status === 'completed') {
    redirect('/employee/dashboard?notice=already_completed')
  }

  // Now use the regular client for auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/employee-login?token=${token}`)
  }

  // Logged in — accept the invitation server-side
  // DEBUG: log that we reached this point in the join page
  const debugAdminClient = createAdminClient()
  await debugAdminClient.from('audit_log').insert({
    actor_id: user.id,
    actor_type: 'employee',
    action: 'invitation_accepted',
    resource_type: 'onboarding_instance',
    resource_id: onboarding.id,
    metadata: {
      DEBUG_TAG: 'join_page_reached_accept',
      userId: user.id,
      onboardingId: onboarding.id,
      token,
    },
  })

  // Logged in — accept the invitation server-side
  const result = await acceptInvitation(token, user.id, onboarding.id)

  if (result.error) {
    redirect(`/employee/dashboard?error=${result.error}`)
  }

  redirect(result.redirectTo || `/employee/onboarding/${onboarding.id}?welcomed=true`)
}