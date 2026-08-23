import Link from 'next/link'

export interface OnboardingInstance {
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

export default function OnboardingsList({ items }: { items: OnboardingInstance[] }) {
  return (
    <div className="space-y-3 sm:space-y-0 sm:bg-white sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-sm sm:overflow-hidden">
      <div className="hidden sm:grid sm:grid-cols-[1fr_120px_140px_160px_80px] gap-4 px-6 py-3.5 border-b border-slate-100 bg-slate-50">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">New starter</span>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</span>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Start date</span>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Readiness</span>
        <span />
      </div>
      {items.map((o) => (
        <Link key={o.id} href={`/dashboard/onboarding/${o.id}`} className="block bg-white rounded-xl border border-slate-200 px-4 py-4 hover:border-teal-300 hover:shadow-sm transition-all sm:rounded-none sm:border-0 sm:border-b sm:border-slate-100 sm:last:border-0 sm:px-6 sm:hover:bg-stone-50 sm:hover:shadow-none sm:hover:border-slate-100">
          <div className="flex items-start justify-between gap-3 sm:contents">
            <div className="min-w-0 flex-1 sm:contents">
              <div className="min-w-0 hidden sm:block">
                <p className="text-sm font-medium text-slate-900 truncate">{o.invitee_name}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{o.role_title}</p>
              </div>
              <div className="sm:hidden">
                <p className="text-sm font-semibold text-slate-900">{o.invitee_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{o.role_title} · {new Date(o.start_date).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})}</p>
                <p className="text-xs text-slate-400 mt-0.5">{daysUntil(o.start_date)}</p>
              </div>
            </div>
            <div className="shrink-0 sm:hidden">{statusBadge(o.status)}</div>
            <div className="hidden sm:block">{statusBadge(o.status)}</div>
            <div className="hidden sm:block">
              <p className="text-sm text-slate-700">{new Date(o.start_date).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})}</p>
              <p className="text-xs text-slate-400 mt-0.5">{daysUntil(o.start_date)}</p>
            </div>
            <div className="hidden sm:block"><ReadinessBar pct={o.readiness_pct ?? 0} /></div>
            <div className="hidden sm:flex sm:justify-end">
              <span className="text-xs font-medium text-teal-700">Review</span>
            </div>
          </div>
          <div className="mt-3 sm:hidden">
            <ReadinessBar pct={o.readiness_pct ?? 0} />
          </div>
        </Link>
      ))}
    </div>
  )
}
