'use client'

// Employer compliance overview: stat cards, an action queue, the people x
// requirements matrix, and organisation-level items.

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StatusBadge, StatusDot } from './StatusBadge'
import Modal from './Modal'
import RecordForm from './RecordForm'
import { describeDue, formatDate } from '@/lib/compliance/format'
import { STATUS_META, type ComplianceRecord, type ComplianceStatus, type RequirementType, type RoleGroup } from '@/lib/compliance/types'
import type { StatusCounts } from '@/lib/compliance/engine'
import { clearExemption, deleteRecord, getEvidenceUrl, setExemption } from '@/app/(employer)/compliance/actions'

export interface OverviewRequirement {
  id: string
  type: RequirementType
  intervalMonths: number | null
}

export interface OverviewCell {
  reqId: string
  status: ComplianceStatus
  daysUntil: number | null
  expiresAt: string | null
}

export interface OverviewPerson {
  id: string
  full_name: string
  job_title: string | null
  role_group_ids: string[]
  worst: ComplianceStatus | null
  counts: StatusCounts
  cells: OverviewCell[]
}

export interface OrgCell {
  reqId: string
  type: RequirementType
  intervalMonths: number | null
  record: ComplianceRecord | null
  status: ComplianceStatus
  daysUntil: number | null
}

export interface OverviewVM {
  requirements: OverviewRequirement[]
  people: OverviewPerson[]
  org: OrgCell[]
  roleGroups: RoleGroup[]
  totals: StatusCounts & { people: number; atRisk: number; workBlockingExpired: number }
  hasAnyRequirements: boolean
}

type QueueFilter = 'attention' | 'expired' | 'missing' | 'review' | '30' | '60' | '90'

function StatCard({ label, value, tone, href }: { label: string; value: number; tone?: 'red' | 'amber' | 'teal'; href?: string }) {
  const colour = tone === 'red' ? 'text-status-rejected' : tone === 'amber' ? 'text-status-pending' : tone === 'teal' ? 'text-fg-accent' : 'text-fg'
  const inner = (
    <div className="bg-ink-raised rounded-xl border border-line px-5 py-4 h-full">
      <p className="text-xs font-medium text-fg-muted mb-1">{label}</p>
      <p className={`text-3xl font-semibold tabular-nums ${colour}`}>{value}</p>
    </div>
  )
  return href ? <Link href={href} className="block hover:opacity-90">{inner}</Link> : inner
}

export default function ComplianceOverview({ vm }: { vm: OverviewVM }) {
  const router = useRouter()
  const [filter, setFilter] = useState<QueueFilter>('attention')
  const [group, setGroup] = useState('')
  const [reqFilter, setReqFilter] = useState('')
  const [orgModal, setOrgModal] = useState<{ cell: OrgCell; kind: 'record' | 'exempt' } | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [viewing, setViewing] = useState<{ url?: string; reference?: string | null; name: string } | null>(null)

  const reqById = useMemo(() => new Map(vm.requirements.map((r) => [r.id, r])), [vm.requirements])

  const queue = useMemo(() => {
    const items: { person: OverviewPerson; req: OverviewRequirement; cell: OverviewCell }[] = []
    for (const person of vm.people) {
      if (group && !person.role_group_ids.includes(group)) continue
      for (const cell of person.cells) {
        const req = reqById.get(cell.reqId)
        if (!req) continue
        if (reqFilter && req.id !== reqFilter) continue
        const s = cell.status
        const d = cell.daysUntil
        const keep =
          filter === 'attention' ? ['expired', 'missing', 'rejected', 'awaiting_review', 'expiring'].includes(s)
          : filter === 'expired' ? s === 'expired'
          : filter === 'missing' ? s === 'missing' || s === 'rejected'
          : filter === 'review' ? s === 'awaiting_review'
          : (s === 'expiring' || s === 'expired') && d !== null && d <= Number(filter)
        if (keep) items.push({ person, req, cell })
      }
    }
    return items.sort((a, b) => STATUS_META[a.cell.status].rank - STATUS_META[b.cell.status].rank || (a.cell.daysUntil ?? 9999) - (b.cell.daysUntil ?? 9999))
  }, [vm.people, reqById, filter, group, reqFilter])

  const matrixPeople = useMemo(() => vm.people.filter((p) => !group || p.role_group_ids.includes(group)), [vm.people, group])
  const matrixReqs = useMemo(() => (reqFilter ? vm.requirements.filter((r) => r.id === reqFilter) : vm.requirements), [vm.requirements, reqFilter])

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.error) setError(res.error)
      else {
        setOrgModal(null)
        setReason('')
        router.refresh()
      }
    })
  }

  async function viewOrg(cell: OrgCell) {
    if (!cell.record) return
    const res = await getEvidenceUrl(cell.record.id)
    if (res.error) setError(res.error)
    else setViewing({ url: res.url, reference: res.reference, name: cell.type.name })
  }

  if (!vm.hasAnyRequirements) {
    return (
      <div className="bg-ink-raised rounded-2xl border border-line shadow-sm px-8 py-14 text-center max-w-2xl">
        <h2 className="text-lg font-semibold text-fg">Choose what you need to track</h2>
        <p className="mt-2 text-sm text-fg-muted leading-relaxed">
          Pick your sector to enable the usual requirements in one click, then tick or untick anything to match how you actually work. Every interval that is convention rather than law can be changed.
        </p>
        <Link href="/compliance/settings" className="mt-6 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">Set up requirements</Link>
      </div>
    )
  }

  const filters: { id: QueueFilter; label: string; count: number }[] = [
    { id: 'attention', label: 'Needs attention', count: vm.totals.expired + vm.totals.missing + vm.totals.rejected + vm.totals.awaiting_review + vm.totals.expiring },
    { id: 'expired', label: 'Expired', count: vm.totals.expired },
    { id: 'missing', label: 'Missing', count: vm.totals.missing + vm.totals.rejected },
    { id: 'review', label: 'Awaiting review', count: vm.totals.awaiting_review },
    { id: '30', label: 'Due in 30 days', count: 0 },
    { id: '60', label: 'Due in 60 days', count: 0 },
    { id: '90', label: 'Due in 90 days', count: 0 },
  ]

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-4 py-3">
          <p className="text-sm text-status-rejected">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
        <StatCard label="People tracked" value={vm.totals.people} href="/workforce" />
        <StatCard label="Required to work, lapsed" value={vm.totals.workBlockingExpired} tone="red" />
        <StatCard label="Expired" value={vm.totals.expired} tone="red" />
        <StatCard label="Expiring" value={vm.totals.expiring} tone="amber" />
        <StatCard label="Awaiting review" value={vm.totals.awaiting_review} tone="teal" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filter === f.id ? 'border-brand bg-brand/15 text-fg-accent' : 'border-line text-fg-body hover:border-line-strong'}`}>
            {f.label}{f.count > 0 && f.id !== '30' && f.id !== '60' && f.id !== '90' ? ` (${f.count})` : ''}
          </button>
        ))}
        <span className="flex-1" />
        {vm.roleGroups.length > 0 && (
          <select value={group} onChange={(e) => setGroup(e.target.value)} className="rounded-lg border border-line-strong bg-ink-raised px-3 py-1.5 text-xs text-fg">
            <option value="">All groups</option>
            {vm.roleGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <select value={reqFilter} onChange={(e) => setReqFilter(e.target.value)} className="rounded-lg border border-line-strong bg-ink-raised px-3 py-1.5 text-xs text-fg max-w-[220px]">
          <option value="">All requirements</option>
          {vm.requirements.map((r) => <option key={r.id} value={r.id}>{r.type.name}</option>)}
        </select>
      </div>

      {/* Action queue */}
      <section>
        <h2 className="text-sm font-semibold text-fg mb-3">Action queue <span className="font-normal text-fg-muted">({queue.length})</span></h2>
        {queue.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong px-6 py-8 text-center">
            <p className="text-sm text-fg-body">Nothing here. Everything in this view is in date.</p>
          </div>
        ) : (
          <div className="bg-ink-raised rounded-2xl border border-line divide-y divide-line overflow-hidden">
            {queue.slice(0, 200).map(({ person, req, cell }) => (
              <Link key={`${person.id}:${req.id}`} href={`/workforce/${person.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-ink-raised-hover transition">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{person.full_name} <span className="font-normal text-fg-muted">{person.job_title ? `· ${person.job_title}` : ''}</span></p>
                  <p className="text-xs text-fg-body truncate">{req.type.name}{req.type.work_blocking ? ' · required to work' : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-fg-muted">{describeDue(cell.status, cell.daysUntil, cell.expiresAt)}</span>
                  <StatusBadge status={cell.status} />
                </div>
              </Link>
            ))}
            {queue.length > 200 && <p className="px-5 py-3 text-xs text-fg-muted">Showing the first 200. Narrow the filters to see the rest.</p>}
          </div>
        )}
      </section>

      {/* Matrix */}
      {matrixPeople.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-fg mb-3">Matrix</h2>
          <div className="bg-ink-raised rounded-2xl border border-line overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-ink-inset">
                  <th className="sticky left-0 bg-ink-inset px-4 py-2 text-left font-semibold text-fg-muted uppercase tracking-wide min-w-[180px]">Person</th>
                  {matrixReqs.map((r) => (
                    <th key={r.id} className="px-2 py-2 text-left font-medium text-fg-muted min-w-[110px] max-w-[140px] align-bottom" title={r.type.name}>
                      <span className="line-clamp-2 leading-tight">{r.type.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {matrixPeople.map((p) => {
                  const cellByReq = new Map(p.cells.map((c) => [c.reqId, c]))
                  return (
                    <tr key={p.id} className="hover:bg-ink-raised-hover">
                      <td className="sticky left-0 bg-ink-raised px-4 py-2 whitespace-nowrap">
                        <Link href={`/workforce/${p.id}`} className="font-medium text-fg hover:text-fg-accent">{p.full_name}</Link>
                      </td>
                      {matrixReqs.map((r) => {
                        const c = cellByReq.get(r.id)
                        return (
                          <td key={r.id} className="px-2 py-2">
                            {c ? (
                              <Link href={`/workforce/${p.id}`} className="flex items-center gap-1.5" title={`${r.type.name}: ${describeDue(c.status, c.daysUntil, c.expiresAt)}`}>
                                <StatusDot status={c.status} />
                                <span className="text-fg-muted">{c.expiresAt ? formatDate(c.expiresAt).replace(/ \d{4}$/, '') : STATUS_META[c.status].label}</span>
                              </Link>
                            ) : (
                              <span className="text-fg-muted/40">n/a</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-fg-muted">n/a means the requirement does not apply to that person's role groups.</p>
        </section>
      )}

      {/* Organisation */}
      {vm.org.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-fg mb-3">Organisation</h2>
          <div className="bg-ink-raised rounded-2xl border border-line divide-y divide-line overflow-hidden">
            {vm.org.map((cell) => (
              <div key={cell.reqId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-fg">{cell.type.name}</p>
                    <StatusBadge status={cell.status} />
                  </div>
                  <p className="text-xs text-fg-muted mt-0.5">{describeDue(cell.status, cell.daysUntil, cell.record?.expires_at)}{cell.record?.is_exempt && cell.record.exempt_reason ? ` · ${cell.record.exempt_reason}` : ''}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cell.record && !cell.record.is_exempt && (cell.record.document_path || cell.type.reference_label) && (
                    <button type="button" onClick={() => viewOrg(cell)} className="rounded-md border border-line-strong px-2.5 py-1 text-xs font-medium text-fg-body hover:bg-ink-raised-hover">View</button>
                  )}
                  {!cell.record?.is_exempt && (
                    <button type="button" onClick={() => setOrgModal({ cell, kind: 'record' })} className="rounded-md bg-brand px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-hover">{cell.record ? 'Renew' : 'Add record'}</button>
                  )}
                  {cell.record?.is_exempt ? (
                    <button type="button" disabled={pending} onClick={() => run(() => clearExemption(cell.record!.id))} className="rounded-md border border-line-strong px-2.5 py-1 text-xs font-medium text-fg-body">Remove exemption</button>
                  ) : (
                    <button type="button" onClick={() => { setReason(''); setOrgModal({ cell, kind: 'exempt' }) }} className="rounded-md border border-line-strong px-2.5 py-1 text-xs font-medium text-fg-body">Not applicable</button>
                  )}
                  {cell.record && !cell.record.is_exempt && (
                    <button type="button" disabled={pending} onClick={() => { if (confirm('Delete this record?')) run(() => deleteRecord(cell.record!.id)) }} className="rounded-md border border-line-strong px-2.5 py-1 text-xs font-medium text-status-rejected">Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <Modal open={orgModal?.kind === 'record'} onClose={() => setOrgModal(null)}>
        {orgModal?.kind === 'record' && (
          <RecordForm mode="employer" employmentId={null} employerRequirementId={orgModal.cell.reqId} type={orgModal.cell.type} intervalMonths={orgModal.cell.intervalMonths} dateOfBirth={null} isRenewal={!!orgModal.cell.record} onDone={() => { setOrgModal(null); router.refresh() }} onCancel={() => setOrgModal(null)} />
        )}
      </Modal>
      <Modal open={orgModal?.kind === 'exempt'} onClose={() => setOrgModal(null)}>
        {orgModal?.kind === 'exempt' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-fg">Mark as not applicable: {orgModal.cell.type.name}</h3>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-line-strong bg-ink-raised px-3 py-2 text-sm text-fg" placeholder="Why it does not apply to your organisation" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOrgModal(null)} className="px-3 py-2 text-sm text-fg-body">Cancel</button>
              <button type="button" disabled={pending} onClick={() => run(() => setExemption({ employmentId: null, employerRequirementId: orgModal.cell.reqId, reason }))} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save</button>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!viewing} onClose={() => setViewing(null)}>
        {viewing && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-fg">{viewing.name}</h3>
            {viewing.reference && <p className="text-sm text-fg-body">Reference: <span className="font-mono text-fg">{viewing.reference}</span></p>}
            {viewing.url ? <a href={viewing.url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Open evidence in a new tab</a> : <p className="text-xs text-fg-muted">No file attached.</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
