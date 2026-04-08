import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface OnboardingInstance {
  id: string
  invitee_name: string
  role_title: string
  start_date: string
  status: string
  readiness_pct: number
  invitee_email: string
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    invited: { label: 'Invited', className: 'bg-slate-100 text-slate-600' },
    in_progress: { label: 'In progress', className: 'bg-blue-50 text-blue-700' },
    submitted: { label: 'Submitted', className: 'bg-amber-50 text-amber-700' },
    complete: { label: 'Complete', className: 'bg-teal-50 text-teal-700' },
  }
  const s = map[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  )
}

function ReadinessBar({ pct }: { pct: number }) {
  const color = pct === 100 ? 'bg-teal-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-500 shrink-0">{pct}%</span>
    </div>
  )
}

function daysUntil(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(dateStr)
  start.setHours(0, 0, 0, 0)
  const diff = Math.round((start.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return `Started ${Math.abs(diff)}d ago`
  if (diff === 0) return 'Starts today'
  if (diff === 1) return 'Starts tomorrow'
  return `Starts in ${diff} days`
}

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
    .select('employer_id, full_name, employer_accounts(company_name)')
    .eq('user_id', user!.id)
    .single()

  const employerId = member?.employer_id
  const companyName = (member?.employer_accounts as any)?.company_name ?? 'your company'
  const firstName = member?.full_name?.split(' ')[0] ?? 'there'

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

      {total > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Active onboardings" value={total} />
          <StatCard label="Needs attention" value={needsAttention} accent="amber" />
          <StatCard label="Complete" value={complete} accent="teal" />
        </div>
      )}

      {total === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_140px_160px_80px] gap-4 px-6 py-3.5 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">New starter</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Start date</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Readiness</span>
            <span />
          </div>
          {active.map((o) => (
            <div key={o.id} className="grid grid-cols-[1fr_120px_140px_160px_80px] gap-4 items-center px-6 py-4 border-b border-slate-100 last:border-0 hover:bg-stone-50 transition-colors group">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{o.invitee_name}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{o.role_title}</p>
              </div>
              <div>{statusBadge(o.status)}</div>
              <div>
                <p className="text-sm text-slate-700">
                  {new Date(o.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{daysUntil(o.start_date)}</p>
              </div>
              <div><ReadinessBar pct={o.readiness_pct ?? 0} /></div>
              <div className="flex justify-end">
                <Link href={`/dashboard/onboarding/${o.id}`} className="text-xs font-medium text-teal-700 hover:text-teal-900 opacity-0 group-hover:opacity-100 transition">
                  Review →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}