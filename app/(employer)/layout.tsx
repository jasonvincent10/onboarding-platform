import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarNav from '@/components/employer/SidebarNav'

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
    .select('full_name, role, employer_accounts(company_name, subscription_status, onboardings_used)')
    .eq('user_id', user.id)
    .single()

  const companyName = (member?.employer_accounts as any)?.company_name ?? 'Your Company'
  const onboardingsUsed = (member?.employer_accounts as any)?.onboardings_used ?? 0
  const subscriptionStatus = (member?.employer_accounts as any)?.subscription_status ?? 'trial'
  const memberName = member?.full_name ?? user.email ?? 'You'

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <SidebarNav
        companyName={companyName}
        memberName={memberName}
        onboardingsUsed={onboardingsUsed}
        subscriptionStatus={subscriptionStatus}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-6 py-8 lg:px-10 lg:py-10 max-w-6xl">
          {children}
        </main>
      </div>
    </div>
  )
}