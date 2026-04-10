import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { acceptInvitation } from './actions'

interface JoinPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const { token } = await searchParams

  if (!token) {
    redirect('/auth/login?error=invalid_invite')
  }

  const supabase = await createClient()

  // Check if token is valid before anything else
  const { data: onboarding, error } = await supabase
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

  // Check if user is already authenticated
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Not logged in — send to employee auth with token preserved
    redirect(`/auth/employee-login?token=${token}`)
  }

  // Logged in — accept the invitation server-side
  const result = await acceptInvitation(token, user.id, onboarding.id)

  if (result.error) {
    redirect(`/employee/dashboard?error=${result.error}`)
  }

  redirect(result.redirectTo || `/employee/onboarding/${onboarding.id}?welcomed=true`)
}
