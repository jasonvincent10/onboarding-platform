import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SarExportButton } from '@/components/ExportButtons'

export default async function EmployeeDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/employee-login')

  // Get employee profile
  const { data: profile } = await supabase
    .from('employee_profiles')
    .select('id, full_name')
    .eq('user_id', user.id)
    .maybeSingle()

  // Get all onboardings for this employee
  const { data: rawOnboardings } = profile
    ? await supabase
        .from('onboarding_instances')
        .select('id, role_title, start_date, status, readiness_pct, employer_id, rejected_at')
        .eq('employee_id', profile.id)
        .is('data_purged_at', null)
        .order('created_at', { ascending: false })
    : { data: [] }

  const employerIds = (rawOnboardings ?? []).map((o) => o.employer_id).filter(Boolean)

  const { data: employerRows } = employerIds.length > 0
    ? await supabase.from('employer_accounts').select('id, company_name').in('id', employerIds)
    : { data: [] }

  const employerMap: Record<string, string> = {}
  for (const e of employerRows ?? []) {
    employerMap[e.id] = e.company_name
  }

  const onboardings = (rawOnboardings ?? []).map((o) => ({
    ...o,
    company_name: employerMap[o.employer_id] ?? 'Your employer',
  }))

  const active = onboardings?.filter(o => o.status !== 'complete' && o.status !== 'rejected') ?? []
  const completed = onboardings?.filter(o => o.status === 'complete') ?? []
  const rejected = onboardings?.filter(o => o.status === 'rejected') ?? []

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold text-fg">
          {profile?.full_name ? `Hello, ${profile.full_name.split(' ')[0]}` : 'Your onboardings'}
        </h1>
        <p className="text-sm text-fg-muted mt-0.5">Complete your onboarding tasks below.</p>
      </div>

      {/* Active onboardings */}
      {active.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">
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
          <h2 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">
            Completed
          </h2>
          <div className="space-y-3">
            {completed.map(o => (
              <OnboardingCard key={o.id} onboarding={o} />
            ))}
          </div>
        </section>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">
            Not successful
          </h2>
          <div className="space-y-3">
            {rejected.map(o => (
              <OnboardingCard key={o.id} onboarding={o} />
            ))}
          </div>
        </section>
      )}
      {/* Your data */}
            {profile && (
              <section className="pt-2 border-t border-line">
                <h2 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">
                  Your data
                </h2>
                <SarExportButton />
              </section>
            )}
      {/* Empty state */}
      {(!onboardings || onboardings.length === 0) && (
        <div className="bg-ink-raised rounded-2xl border border-line p-10 text-center">
          <div className="w-12 h-12 bg-ink-inset rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-fg-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-fg-body">No onboardings yet</p>
          <p className="text-xs text-fg-muted mt-1">
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
  employer_id: string
  company_name: string
  rejected_at: string | null
}

function OnboardingCard({ onboarding: o }: { onboarding: Onboarding }) {
  const pct = o.readiness_pct ?? 0
  const isComplete = o.status === 'complete'
  const isRejected = o.status === 'rejected'
  const startLabel = o.start_date
    ? new Date(o.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBC'

  if (isRejected) {
    const purgeDate = o.rejected_at
      ? new Date(new Date(o.rejected_at).getTime() + 7 * 24 * 60 * 60 * 1000)
      : null
    return (
      <div className="bg-ink-raised rounded-xl border border-line p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg truncate">{o.company_name}</p>
            <p className="text-xs text-fg-muted mt-0.5">{o.role_title}</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-status-rejected bg-status-rejected/10 border border-status-rejected/30 rounded-full px-2 py-0.5">
            Not successful
          </span>
        </div>
        <p className="text-xs text-fg-muted mt-3">
          Your data for this application will be removed automatically
          {purgeDate
            ? ` on ${purgeDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : ' within 7 days'}.
        </p>
      </div>
    )
  }

  return (
    <Link
      href={`/employee/onboarding/${o.id}`}
      className="block bg-ink-raised rounded-xl border border-line p-4 hover:border-brand/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg truncate">
            {o.company_name}
          </p>
          <p className="text-xs text-fg-muted mt-0.5">{o.role_title} · Starts {startLabel}</p>
        </div>
        {isComplete ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-status-approved bg-status-approved/10 border border-status-approved/30 rounded-full px-2 py-0.5">
            <span className="w-1.5 h-1.5 bg-status-approved rounded-full" />
            Confirmed
          </span>
        ) : (
          <span className="shrink-0 text-xs font-semibold text-fg-accent">{pct}%</span>
        )}
      </div>

      {/* Progress bar */}
      {!isComplete && (
        <div className="mt-3">
          <div className="h-1.5 bg-ink-inset rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  )
}
