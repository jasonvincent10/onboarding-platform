import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function EmployeeDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/employee-login')

  // Get employee profile
  const { data: profile } = await supabase
    .from('employee_profiles')
    .select('id, full_name')
    .eq('user_id', user.id)
    .single()

  // Get all onboardings for this employee
  const { data: onboardings } = profile
    ? await supabase
        .from('onboarding_instances')
        .select(`
          id,
          role_title,
          start_date,
          status,
          readiness_pct,
          employer_accounts (company_name)
        `)
        .eq('employee_id', profile.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const active = onboardings?.filter(o => o.status !== 'completed') ?? []
  const completed = onboardings?.filter(o => o.status === 'completed') ?? []

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {profile?.full_name ? `Hello, ${profile.full_name.split(' ')[0]}` : 'Your onboardings'}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Complete your onboarding tasks below.</p>
      </div>

      {/* Active onboardings */}
      {active.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            In progress
          </h2>
          <div className="space-y-3">
            {active.map(o => (
              <OnboardingCard key={o.id} onboarding={o} />
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Completed
          </h2>
          <div className="space-y-3">
            {completed.map(o => (
              <OnboardingCard key={o.id} onboarding={o} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {(!onboardings || onboardings.length === 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700">No onboardings yet</p>
          <p className="text-xs text-slate-400 mt-1">
            When your employer sends you an invitation, it will appear here.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Onboarding card ───────────────────────────────────────────────────────

interface Onboarding {
  id: string
  role_title: string
  start_date: string | null
  status: string
  readiness_pct: number | null
  employer_accounts: { company_name: string } | null
}

function OnboardingCard({ onboarding: o }: { onboarding: Onboarding }) {
  const pct = o.readiness_pct ?? 0
  const isComplete = o.status === 'completed'
  const startLabel = o.start_date
    ? new Date(o.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBC'

  return (
    <Link
      href={`/employee/onboarding/${o.id}`}
      className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {(o.employer_accounts as any)?.company_name ?? 'Unknown Company'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{o.role_title} · Starts {startLabel}</p>
        </div>
        {isComplete ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Complete
          </span>
        ) : (
          <span className="shrink-0 text-xs font-semibold text-indigo-600">{pct}%</span>
        )}
      </div>

      {/* Progress bar */}
      {!isComplete && (
        <div className="mt-3">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  )
}
