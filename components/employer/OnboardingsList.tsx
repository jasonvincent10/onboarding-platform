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
    invited: { label: 'Invited', className: 'bg-status-inactive/15 text-status-inactive' },
    in_progress: { label: 'In progress', className: 'bg-status-inactive/15 text-status-inactive' },
    submitted: { label: 'Submitted', className: 'bg-status-pending/15 text-status-pending' },
    complete: { label: 'Confirmed', className: 'bg-status-approved/15 text-status-approved' },
    rejected: { label: 'Rejected', className: 'bg-status-rejected/15 text-status-rejected' },
  }
  const s = map[status] ?? { label: status, className: 'bg-ink-inset text-fg-body' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  )
}

function ReadinessBar({ pct }: { pct: number }) {
  const color = pct === 100 ? 'bg-status-approved' : pct >= 50 ? 'bg-status-pending' : 'bg-status-rejected'
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex-1 bg-ink-inset rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-fg-muted shrink-0">{pct}%</span>
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
    <div className="space-y-3 sm:space-y-0 sm:bg-ink-raised sm:rounded-2xl sm:border sm:border-line sm:shadow-sm sm:overflow-hidden">
      <div className="hidden sm:grid sm:grid-cols-[1fr_120px_140px_160px_80px] gap-4 px-6 py-3.5 border-b border-line bg-ink-inset">
        <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">New starter</span>
        <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Status</span>
        <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Start date</span>
        <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Readiness</span>
        <span />
      </div>
      {items.map((o) => (
        <Link key={o.id} href={`/dashboard/onboarding/${o.id}`} className="block bg-ink-raised rounded-xl border border-line px-4 py-4 hover:border-brand/40 hover:shadow-sm transition-all sm:rounded-none sm:border-0 sm:border-b sm:border-line sm:last:border-0 sm:px-6 sm:hover:bg-ink-raised-hover sm:hover:shadow-none sm:hover:border-line">
          <div className="flex items-start justify-between gap-3 sm:contents">
            <div className="min-w-0 flex-1 sm:contents">
              <div className="min-w-0 hidden sm:block">
                <p className="text-sm font-medium text-fg truncate">{o.invitee_name}</p>
                <p className="text-xs text-fg-muted truncate mt-0.5">{o.role_title}</p>
              </div>
              <div className="sm:hidden">
                <p className="text-sm font-semibold text-fg">{o.invitee_name}</p>
                <p className="text-xs text-fg-muted mt-0.5">{o.role_title} · {new Date(o.start_date).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})}</p>
                <p className="text-xs text-fg-muted mt-0.5">{daysUntil(o.start_date)}</p>
              </div>
            </div>
            <div className="shrink-0 sm:hidden">{statusBadge(o.status)}</div>
            <div className="hidden sm:block">{statusBadge(o.status)}</div>
            <div className="hidden sm:block">
              <p className="text-sm text-fg-body">{new Date(o.start_date).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})}</p>
              <p className="text-xs text-fg-muted mt-0.5">{daysUntil(o.start_date)}</p>
            </div>
            <div className="hidden sm:block"><ReadinessBar pct={o.readiness_pct ?? 0} /></div>
            <div className="hidden sm:flex sm:justify-end">
              <span className="text-xs font-medium text-fg-accent">Review</span>
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
