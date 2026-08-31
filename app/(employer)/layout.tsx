import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarNav from '@/components/employer/SidebarNav'

// Every page under here requires an authenticated session, so none of it
// should be indexed regardless of what a specific page's own metadata says.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: member } = await supabase
    .from('employer_members')
    .select('full_name, role, employer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const memberName = member?.full_name ?? user.email ?? 'You'

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  const { data: employerAccount } = member?.employer_id
    ? await adminClient
        .from('employer_accounts')
        .select('company_name, subscription_status, onboardings_used')
        .eq('id', member.employer_id)
        .maybeSingle()
    : { data: null }

  const companyName = employerAccount?.company_name ?? 'Your Company'
  const onboardingsUsed = employerAccount?.onboardings_used ?? 0
  const subscriptionStatus = employerAccount?.subscription_status ?? 'trial'

  return (
    <div className="min-h-screen bg-ink lg:flex">
      <SidebarNav
        companyName={companyName}
        memberName={memberName}
        onboardingsUsed={onboardingsUsed}
        subscriptionStatus={subscriptionStatus}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-4 pt-20 pb-6 sm:px-6 sm:pt-8 sm:pb-8 lg:px-10 lg:py-10 max-w-6xl">
          {children}
        </main>
      </div>
    </div>
  )
}