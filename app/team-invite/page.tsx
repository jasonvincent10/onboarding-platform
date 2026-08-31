import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { acceptTeamInvitation } from './actions'
import TeamInviteForm from './TeamInviteForm'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Accept team invitation - Vopria',
  description: "Accept your invitation to join your company's Vopria team.",
  path: '/team-invite',
  noIndex: true,
})

interface Props {
  searchParams: Promise<{ token?: string }>
}

function ErrorCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-ink-inset flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-ink-raised rounded-xl border border-line p-8 text-center">
        <h1 className="text-lg font-semibold text-fg mb-2">{title}</h1>
        <p className="text-sm text-fg-body">{body}</p>
        <a
          href="/login"
          className="mt-6 inline-block rounded-lg bg-brand text-white text-sm font-medium px-5 py-2.5 hover:bg-brand-hover"
        >
          Go to sign in
        </a>
      </div>
    </div>
  )
}

export default async function TeamInvitePage({ searchParams }: Props) {
  const { token } = await searchParams
  if (!token) {
    return <ErrorCard title="Invalid link" body="This invitation link is missing its token." />
  }

  const adminClient = createAdminClient()
  const { data: invitation } = await adminClient
    .from('employer_invitations')
    .select('id, employer_id, email, status, employer_accounts(company_name)')
    .eq('invitation_token', token)
    .maybeSingle()

  if (!invitation) {
    return <ErrorCard title="Invitation not found" body="This link is invalid. Ask whoever invited you to send a new one." />
  }
  if (invitation.status === 'revoked') {
    return <ErrorCard title="Invitation revoked" body="This invitation has been withdrawn. Ask whoever invited you to send a new one if this was unexpected." />
  }

  const companyName =
    (invitation.employer_accounts as { company_name?: string } | null)?.company_name ?? 'the team'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <TeamInviteForm
        token={token}
        inviteeEmail={invitation.email}
        companyName={companyName}
        alreadyAccepted={invitation.status === 'accepted'}
      />
    )
  }

  // Already logged in -- try to accept directly rather than making them
  // log out and back in with the same account.
  const result = await acceptTeamInvitation(token)

  if (result.redirectTo) {
    redirect(result.redirectTo)
  }

  const errorMessages: Record<string, { title: string; body: string }> = {
    email_mismatch: {
      title: 'Wrong account',
      body: `This invitation was sent to ${invitation.email}, but you're signed in with a different email. Sign out and try again with the invited address.`,
    },
    already_on_another_team: {
      title: "You're already on a different team",
      body: `Your account is already part of another company's team on Vopria. One account can only belong to one employer team at a time.`,
    },
    already_accepted: {
      title: 'Already accepted',
      body: `This invitation to join ${companyName} has already been used.`,
    },
    join_failed: {
      title: 'Something went wrong',
      body: 'We could not add you to the team. Please try again or ask whoever invited you to send a new link.',
    },
  }

  const err = errorMessages[result.error ?? ''] ?? {
    title: 'Something went wrong',
    body: 'Please try again or ask whoever invited you to send a new link.',
  }

  return <ErrorCard title={err.title} body={err.body} />
}
