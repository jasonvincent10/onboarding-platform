import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InviteForm from './InviteForm'

export const metadata = {
  title: 'Invite New Starter — Onboarder',
}

export default async function InvitePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get this user's employer membership + company name
  const { data: member } = await supabase
    .from('employer_members')
    .select('employer_id, employer_accounts(company_name)')
    .eq('user_id', user.id)
    .single()

  if (!member) {
    // Task 1.3 bug: employer_accounts/employer_members rows weren't created on sign-up.
    // The fix is in the sign-up server action — see CONTEXT.md notes.
    // Redirect to dashboard with an error banner rather than showing a broken page.
    redirect('/dashboard?error=account_setup_incomplete')
  }

  // Fetch this employer's templates for the select dropdown
  const { data: templates } = await supabase
    .from('onboarding_templates')
    .select('id, template_name, role_type, is_default')
    .eq('employer_id', member.employer_id)
    .order('is_default', { ascending: false }) // default template first
    .order('template_name', { ascending: true })

  return (
    <InviteForm
      templates={templates ?? []}
      companyName={(member.employer_accounts as any)?.company_name ?? ''}
    />
  )
}
