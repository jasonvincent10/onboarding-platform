'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/compliance/StatusBadge'
import { formatDate } from '@/lib/compliance/format'
import type { ComplianceStatus, RoleGroup } from '@/lib/compliance/types'
import type { StatusCounts } from '@/lib/compliance/engine'

export interface WorkforceRow {
  id: string
  full_name: string
  email: string | null
  job_title: string | null
  department: string | null
  start_date: string | null
  end_date: string | null
  status: 'active' | 'leaver'
  employee_id: string | null
  role_group_ids: string[]
  worst: ComplianceStatus | null
  counts: StatusCounts | null
  requirementCount: number
}

interface Props {
  people: WorkforceRow[]
  roleGroups: RoleGroup[]
}

export default function WorkforceList({ people, roleGroups }: Props) {
  const [tab, setTab] = useState<'active' | 'leaver'>('active')
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const [onlyAtRisk, setOnlyAtRisk] = useState(false)

  const groupName = useMemo(() => new Map(roleGroups.map((g) => [g.id, g.name])), [roleGroups])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return people.filter((p) => {
      if (p.status !== tab) return false
      if (group && !p.role_group_ids.includes(group)) return false
      if (onlyAtRisk && !(p.worst === 'expired' || p.worst === 'missing' || p.worst === 'rejected')) return false
      if (q && !`${p.full_name} ${p.email ?? ''} ${p.job_title ?? ''} ${p.department ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [people, tab, query, group, onlyAtRisk])

  const activeCount = people.filter((p) => p.status === 'active').length
  const leaverCount = people.length - activeCount

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-line bg-ink-raised p-0.5">
          <button type="button" onClick={() => setTab('active')} className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${tab === 'active' ? 'bg-brand/15 text-fg-accent' : 'text-fg-muted hover:text-fg'}`}>Active ({activeCount})</button>
          <button type="button" onClick={() => setTab('leaver')} className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${tab === 'leaver' ? 'bg-brand/15 text-fg-accent' : 'text-fg-muted hover:text-fg'}`}>Leavers ({leaverCount})</button>
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, role" className="flex-1 min-w-[180px] rounded-lg border border-line-strong bg-ink-raised px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand/20" />
        {roleGroups.length > 0 && (
          <select value={group} onChange={(e) => setGroup(e.target.value)} className="rounded-lg border border-line-strong bg-ink-raised px-3 py-2 text-sm text-fg">
            <option value="">All groups</option>
            {roleGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-fg-body">
          <input type="checkbox" checked={onlyAtRisk} onChange={(e) => setOnlyAtRisk(e.target.checked)} className="accent-brand" />
          At risk only
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
          <p className="text-sm font-medium text-fg-body">{tab === 'leaver' ? 'No leavers.' : 'Nobody matches these filters.'}</p>
        </div>
      ) : (
        <div className="bg-ink-raised rounded-2xl border border-line shadow-sm overflow-hidden">
          <div className="hidden sm:grid sm:grid-cols-[1fr_180px_140px_150px_60px] gap-4 px-5 py-3 border-b border-line bg-ink-inset">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Person</span>
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Role</span>
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">{tab === 'active' ? 'Started' : 'Left'}</span>
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Compliance</span>
            <span />
          </div>
          <div className="divide-y divide-line">
            {rows.map((p) => (
              <Link key={p.id} href={`/workforce/${p.id}`} className="grid grid-cols-1 sm:grid-cols-[1fr_180px_140px_150px_60px] gap-2 sm:gap-4 px-5 py-3.5 hover:bg-ink-raised-hover transition">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{p.full_name}</p>
                  <p className="text-xs text-fg-muted truncate">
                    {p.email ?? 'No email'}
                    {p.employee_id ? ' · Has Vopria access' : ''}
                    {p.role_group_ids.length > 0 && ` · ${p.role_group_ids.map((id) => groupName.get(id)).filter(Boolean).join(', ')}`}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-fg-body truncate">{p.job_title ?? ''}</p>
                  <p className="text-xs text-fg-muted truncate">{p.department ?? ''}</p>
                </div>
                <p className="text-sm text-fg-body">{formatDate(tab === 'active' ? p.start_date : p.end_date) || ''}</p>
                <div>
                  {p.status === 'leaver' ? (
                    <span className="text-xs text-fg-muted">Not tracked</span>
                  ) : p.requirementCount === 0 ? (
                    <span className="text-xs text-fg-muted">No requirements</span>
                  ) : p.worst ? (
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={p.worst} label={p.worst === 'valid' ? 'All in date' : undefined} />
                      {p.counts && (p.counts.expired + p.counts.missing + p.counts.expiring + p.counts.awaiting_review + p.counts.rejected > 0) && (
                        <span className="text-[11px] text-fg-muted">
                          {[
                            p.counts.expired > 0 && `${p.counts.expired} expired`,
                            p.counts.missing > 0 && `${p.counts.missing} missing`,
                            p.counts.rejected > 0 && `${p.counts.rejected} rejected`,
                            p.counts.expiring > 0 && `${p.counts.expiring} expiring`,
                            p.counts.awaiting_review > 0 && `${p.counts.awaiting_review} to review`,
                          ].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
                <span className="hidden sm:block text-xs font-medium text-fg-accent text-right">Open</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
