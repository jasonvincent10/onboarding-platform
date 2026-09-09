import { STATUS_META, type ComplianceStatus } from '@/lib/compliance/types'

export function StatusBadge({ status, label }: { status: ComplianceStatus; label?: string }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${meta.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {label ?? meta.label}
    </span>
  )
}

export function StatusDot({ status, title }: { status: ComplianceStatus | null; title?: string }) {
  if (!status) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-ink-inset border border-line" title={title} />
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_META[status].dot}`} title={title} />
}
