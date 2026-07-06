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
    redirect('/login?error=invalid_invite')
  }

  // Validate the token exists before asking anyone to log in. Read-only
  // lookup by token -- no mutation happens on this page except via the
  // acceptInvitation action, which re-verifies everything itself.
  const adminClient = createAdminClient()

  const { data: onboarding, error } = await adminClient
    .from('onboarding_instances')
    .select('id, invitee_name, status, employer_accounts(company_name)')
    .eq('invitation_token', token)
    .maybeSingle()

  if (error || !onboarding) {
    redirect('/login?error=invalid_invite')
  }

  if (onboarding.status === 'completed') {
    redirect('/employee/dashboard?notice=already_completed')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/employee-login?token=${token}`)
  }

  // If the logged-in user is an employer member, do NOT accept the invite
  // with this account. Doing so used to create an employee profile for the
  // employer's auth user and mis-claim the onboarding, which then blocked
  // the real employee. Show a clear explanation instead.
  const { data: employerMember } = await adminClient
    .from('employer_members')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (employerMember) {
    const companyName =
      (onboarding.employer_accounts as { company_name?: string } | null)?.company_name ??
      'the inviting company'

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-8">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            You are signed in as an employer
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            This invitation from {companyName} is for a new starter and must be
            accepted with an employee account. You are currently signed in to an
            employer account, so accepting it here would link the onboarding to
            the wrong account.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            To accept this invitation: sign out first, or open the invite link
            in a different browser or a private window, then sign in or sign up
            with the employee email address.
          </p>
          <a
            href="/dashboard"
            className="inline-block w-full text-center rounded-lg bg-gray-900 text-white text-sm font-medium py-2.5 hover:bg-gray-700"
          >
            Back to your dashboard
          </a>
        </div>
      </div>
    )
  }

  const result = await acceptInvitation(token)

  if (result.error === 'employer_session') {
    // Defence in depth: the action re-checks employer membership itself.
    redirect('/dashboard')
  }

  if (result.error) {
    redirect(`/employee/dashboard?error=${result.error}`)
  }

  redirect(result.redirectTo || `/employee/onboarding/${result.onboardingId ?? onboarding.id}?welcomed=true`)
}
