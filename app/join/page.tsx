import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { acceptInvitation } from './actions'

interface JoinPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const { token } = await searchParams

  if (!token) {
    redirect('/auth/login?error=invalid_invite')
  }

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

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/employee-login?token=${token}`)
  }

  const result = await acceptInvitation(token, user.id, onboarding.id)

  if (result.error) {
    redirect(`/employee/dashboard?error=${result.error}`)
  }

  redirect(result.redirectTo || `/employee/onboarding/${onboarding.id}?welcomed=true`)
}