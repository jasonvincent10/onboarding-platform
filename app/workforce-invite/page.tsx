import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { acceptWorkforceInvite } from './actions'
import WorkforceInviteForm from './WorkforceInviteForm'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Set up your compliance access - Vopria',
  description: 'Accept your invitation to see and upload your training, licences and checks on Vopria.',
  path: '/workforce-invite',
  noIndex: true,
})

function ErrorCard({ title, body, href = '/employee-login', cta = 'Go to sign in' }: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="min-h-screen bg-ink-inset flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-ink-raised rounded-xl border border-line p-8 text-center">
        <h1 className="text-lg font-semibold text-fg mb-2">{title}</h1>
        <p className="text-sm text-fg-body">{body}</p>
        <a href={href} className="mt-6 inline-block rounded-lg bg-brand text-white text-sm font-medium px-5 py-2.5 hover:bg-brand-hover">{cta}</a>
      </div>
    </div>
  )
}

export default async function WorkforceInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  if (!token) return <ErrorCard title="Invalid link" body="This invitation link is missing its token." />

  const adminClient = createAdminClient()
  const { data: employment } = await adminClient
    .from('employments')
    .select('id, employer_id, full_name, email, status, employee_id')
    .eq('invitation_token', token)
    .maybeSingle()
  if (!employment) return <ErrorCard title="Invitation not found" body="This link is invalid. Ask your employer to send a new one." />
  if (employment.status !== 'active') return <ErrorCard title="Invitation no longer active" body="This record is no longer active with the employer." />
  if (!employment.email) return <ErrorCard title="No email on record" body="Ask your employer to add your email address and resend the invitation." />

  const { data: account } = await adminClient.from('employer_accounts').select('company_name').eq('id', employment.employer_id).maybeSingle()
  const companyName = account?.company_name ?? 'Your employer'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <WorkforceInviteForm token={token} inviteeEmail={employment.email} personName={employment.full_name} companyName={companyName} />
  }

  const result = await acceptWorkforceInvite(token)
  if (result.redirectTo) redirect(result.redirectTo)

  const messages: Record<string, { title: string; body: string; href?: string; cta?: string }> = {
    employer_session: {
      title: "You're signed in as an employer",
      body: 'This link is for an employee account. Sign out, or open it in a different browser, then try again.',
      href: '/dashboard',
      cta: 'Back to dashboard',
    },
    already_claimed: { title: 'Already linked', body: 'This record is linked to a different Vopria account. Ask your employer to check the email address.' },
    already_on_workforce: { title: 'Already on this workforce', body: 'Your account is already linked to this employer.', href: '/employee/compliance', cta: 'Open your compliance' },
    not_active: { title: 'Invitation no longer active', body: 'This record is no longer active with the employer.' },
  }
  const msg = messages[result.error ?? ''] ?? { title: 'Something went wrong', body: 'Please try again or ask your employer to send a new link.' }
  return <ErrorCard title={msg.title} body={msg.body} href={msg.href} cta={msg.cta} />
}
