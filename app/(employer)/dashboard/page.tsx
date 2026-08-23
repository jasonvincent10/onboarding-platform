import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { EmployerExportButton } from "@/components/ExportButtons";
import { BillingUsage } from "@/components/BillingUsage";
import { getBillingState } from "@/lib/billing";
import OnboardingsList, { type OnboardingInstance } from '@/components/employer/OnboardingsList'

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'amber' | 'teal' }) {
  const valueColor = accent === 'amber' ? 'text-amber-600' : accent === 'teal' ? 'text-teal-700' : 'text-slate-900'
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-3xl font-semibold tabular-nums ${valueColor}`}>{value}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="h-1.5 rounded-t-2xl bg-gradient-to-r from-teal-400 via-teal-600 to-teal-800" />
      <div className="px-8 py-16 flex flex-col items-center text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-6">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-teal-600">
            <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10 10-4.477 10-10S19.523 4 14 4Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M14 9v5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">No active onboardings</h2>
        <p className="text-[15px] text-slate-500 leading-relaxed mb-8">
          When you invite a new starter, their onboarding will appear here. Track progress, review documents, and see day-one readiness at a glance.
        </p>
        <div className="w-full space-y-3 mb-8 text-left">
          {[
            { n: '1', title: 'Invite your new starter', body: 'Enter their name, email, role, and start date.' },
            { n: '2', title: 'They complete their checklist', body: 'Upload P45, right to work docs, bank details, and more.' },
            { n: '3', title: 'You review and approve', body: 'One-click approval. Everything logged for compliance.' },
          ].map((step) => (
            <div key={step.n} className="flex gap-3.5 items-start">
              <div className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {step.n}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{step.title}</p>
                <p className="text-sm text-slate-400">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/dashboard/invite"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 transition"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Invite your first new starter
        </Link>
        <p className="mt-4 text-xs text-slate-400">Your first 3 onboardings are free. No credit card needed.</p>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('employer_members')
    .select('employer_id, full_name')
    .eq('user_id', user!.id)
    .maybeSingle()

  const employerId = member?.employer_id
  const firstName = member?.full_name?.split(' ')[0] ?? 'there'

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  const { data: employerAccount } = employerId
    ? await adminClient.from('employer_accounts').select('company_name').eq('id', employerId).maybeSingle()
    : { data: null }
  const companyName = employerAccount?.company_name ?? 'your company'

  const { data: onboardings } = await supabase
    .from('onboarding_instances')
    .select('id, invitee_name, role_title, start_date, status, readiness_pct, invitee_email')
    .eq('employer_id', employerId)
    .order('start_date', { ascending: true })
    .limit(20)

  const active = (onboardings ?? []) as OnboardingInstance[]
  const total = active.length
  const needsAttention = active.filter((o) => o.readiness_pct < 50 || o.status === 'submitted').length
  const complete = active.filter((o) => o.status === 'complete').length

  const billing = employerId ? await getBillingState(employerId) : null

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Good {getTimeOfDay()}, {firstName}
          </h1>
          <p className="text-slate-500 mt-1 text-[15px]">
            {total === 0
              ? 'No active onboardings yet. Invite your first new starter to get going.'
              : `${total} active onboarding${total !== 1 ? 's' : ''} for ${companyName}.`}
          </p>
        </div>
        <Link
          href="/dashboard/invite"
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 transition"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Invite new starter
        </Link>
      </div>

      {billing && <div className="mb-6"><BillingUsage state={billing} /></div>}

      {total > 0 && <EmployerExportButton />}

      {total > 0 && (
        <div className="grid grid-cols-1 gap-3 mb-8 sm:grid-cols-3 sm:gap-4">
          <StatCard label="Active onboardings" value={total} />
          <StatCard label="Needs attention" value={needsAttention} accent="amber" />
          <StatCard label="Complete" value={complete} accent="teal" />
        </div>
      )}

      {total === 0 ? (
        <EmptyState />
      ) : (
        <>
          <OnboardingsList items={active} />
          {total === 20 && (
            <p className="mt-4 text-center">
              <Link href="/onboardings" className="text-sm font-medium text-teal-700 hover:text-teal-800 transition">
                View all onboardings →
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  )
}