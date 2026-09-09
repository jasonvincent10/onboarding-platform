import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buildEmployeeCompliance } from '@/lib/compliance/queries'
import MyCompliance, { type MyEmployerView } from '@/components/compliance/MyCompliance'

export const metadata = { title: 'Your compliance - Vopria' }

export default async function EmployeeCompliancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/employee-login')

  const { data: profile } = await supabase
    .from('employee_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const views = profile ? await buildEmployeeCompliance(profile.id) : []

  const vm: MyEmployerView[] = views.map((v) => ({
    employmentId: v.employment.id,
    companyName: v.companyName,
    jobTitle: v.employment.job_title,
    dateOfBirth: v.employment.date_of_birth,
    cells: v.cells.map((c) => ({
      employerRequirementId: c.requirement.id,
      type: c.type,
      intervalMonths: c.intervalMonths,
      record: c.record,
      status: c.status,
      daysUntil: c.daysUntil,
    })),
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/employee/dashboard" className="text-xs text-fg-muted hover:text-fg">Back to dashboard</Link>
        <h1 className="mt-2 text-xl font-semibold text-fg">Your compliance</h1>
        <p className="text-sm text-fg-muted mt-1">
          Training, licences and checks your employer needs to keep on file. Upload renewals here and they will be checked by your employer.
        </p>
      </div>

      {vm.length === 0 ? (
        <div className="bg-ink-raised rounded-2xl border border-line p-10 text-center">
          <p className="text-sm font-medium text-fg-body">Nothing to track yet</p>
          <p className="text-xs text-fg-muted mt-1">When an employer adds you to their workforce on Vopria, your requirements will appear here.</p>
        </div>
      ) : (
        <MyCompliance views={vm} />
      )}
    </div>
  )
}
