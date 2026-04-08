import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EmployeeNav from '@/components/employee/EmployeeNav'

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/employee-login')
  }

  // Fetch employee profile for the nav
  const { data: profile } = await supabase
    .from('employee_profiles')
    .select('full_name, email')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <EmployeeNav
        name={profile?.full_name ?? profile?.email ?? 'Employee'}
        email={profile?.email ?? user.email ?? ''}
      />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {children}
      </main>
    </div>
  )
}
