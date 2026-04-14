import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CATEGORY_INFO, type DataCategory } from '@/lib/consent'
import ConsentList from './ConsentList'

export default async function ConsentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/employee-login')

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('employee_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profile) redirect('/employee/dashboard')

  // Fetch every consent row this employee has ever created, joined to the
  // employer. We can't use the SQL helper because that's per-employer; we
  // need the full list across employers.
  const { data: rows } = await admin
    .from('consent_records')
    .select('employer_id, data_category, action, created_at, employer_accounts(company_name)')
    .eq('employee_id', profile.id)
    .order('created_at', { ascending: false })

  // Group by employer, then by data_category, keeping only the latest row.
  const grouped: Record<string, { employerId: string; companyName: string; categories: Record<string, { action: string; created_at: string }> }> = {}

  for (const r of rows ?? []) {
    const employerId = r.employer_id as string
    const companyName = (r.employer_accounts as any)?.company_name ?? 'Unknown employer'
    if (!grouped[employerId]) {
      grouped[employerId] = { employerId, companyName, categories: {} }
    }
    // First row wins because we ordered DESC — that's the latest action
    if (!grouped[employerId].categories[r.data_category]) {
      grouped[employerId].categories[r.data_category] = {
        action: r.action,
        created_at: r.created_at,
      }
    }
  }

  const employers = Object.values(grouped).map((g) => ({
    employerId: g.employerId,
    companyName: g.companyName,
    categories: Object.entries(g.categories).map(([key, v]) => ({
      key: key as DataCategory,
      label: CATEGORY_INFO[key as DataCategory]?.label ?? key,
      action: v.action as 'granted' | 'withdrawn',
      changedAt: v.created_at,
    })),
  }))

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Your data sharing</h1>
      <p className="mt-2 text-gray-600">
        Below is every employer you have shared data with through this
        platform, and what you have shared with each. You can withdraw any
        permission at any time. Withdrawing consent prevents the employer
        from accessing that information from now on, but does not delete
        what they have already received.
      </p>

      {employers.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">
          You haven&apos;t shared data with any employers yet.
        </p>
      ) : (
        <ConsentList employers={employers} />
      )}
    </div>
  )
}