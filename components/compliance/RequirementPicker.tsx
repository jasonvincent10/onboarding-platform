'use client'

// Settings: the employer ticks which requirements they enforce. Grouped by
// sector, filterable, each row expandable to set interval, reminders and
// who it applies to.

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORY_LABELS, RENEWAL_RULE_LABELS, SECTOR_LABELS, SECTORS, type EmployerRequirement, type RequirementType, type RoleGroup } from '@/lib/compliance/types'
import { intervalLabel } from '@/lib/compliance/format'
import { enableSectorDefaults, setRequirementEnabled, updateRequirementConfig } from '@/app/(employer)/compliance/settings/actions'

interface Props {
  library: RequirementType[]
  requirements: EmployerRequirement[]
  roleGroups: RoleGroup[]
  sector: string | null
}

const SECTOR_ORDER = ['cross_sector', 'care', 'construction', 'hospitality', 'logistics', 'security', 'custom']

export default function RequirementPicker({ library, requirements, roleGroups, sector }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>(sector && sector !== 'other' ? sector : 'all')
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState<'person' | 'organisation'>('person')
  const [open, setOpen] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const reqByType = useMemo(() => new Map(requirements.map((r) => [r.requirement_type_id, r])), [requirements])
  const enabledCount = requirements.filter((r) => r.enabled).length

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return library.filter((t) => {
      if (t.subject !== subject) return false
      if (filter === 'enabled' && !reqByType.get(t.id)?.enabled) return false
      if (filter !== 'all' && filter !== 'enabled' && !t.sectors.includes(filter)) return false
      if (q && !`${t.name} ${t.description ?? ''} ${t.statutory_basis ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [library, subject, filter, query, reqByType])

  const grouped = useMemo(() => {
    const groups = new Map<string, RequirementType[]>()
    for (const t of visible) {
      const primary = t.employer_id ? 'custom' : SECTOR_ORDER.find((s) => t.sectors.includes(s) && s !== 'cross_sector' && (filter === 'all' || filter === 'enabled' || s === filter)) ?? (t.sectors.includes('cross_sector') ? 'cross_sector' : t.sectors[0])
      const key = filter !== 'all' && filter !== 'enabled' ? filter : primary
      ;(groups.get(key) ?? groups.set(key, []).get(key)!).push(t)
    }
    return SECTOR_ORDER.filter((s) => groups.has(s)).map((s) => ({ sector: s, types: groups.get(s)! }))
  }, [visible, filter])

  function toggle(typeId: string, enabled: boolean) {
    setError(null)
    startTransition(async () => {
      const res = await setRequirementEnabled(typeId, enabled)
      if (res.error) setError(res.error)
      else router.refresh()
    })
  }

  function applySector(s: string) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await enableSectorDefaults(s)
      if (res.error) setError(res.error)
      else {
        setNotice(`Enabled ${res.enabled} requirements for ${SECTOR_LABELS[s as keyof typeof SECTOR_LABELS] ?? s}. Untick anything that does not apply.`)
        setFilter(s)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Sector quick-start */}
      <div className="bg-ink-raised rounded-2xl border border-line px-5 py-4">
        <p className="text-sm font-semibold text-fg">Quick start by sector</p>
        <p className="text-xs text-fg-muted mt-0.5">Enables the usual set for that sector, including the cross-sector HR and safety items. You stay in control: untick anything afterwards.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SECTORS.map((s) => (
            <button key={s.value} type="button" disabled={pending} onClick={() => applySector(s.value)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${sector === s.value ? 'border-brand bg-brand/15 text-fg-accent' : 'border-line-strong text-fg-body hover:border-brand'}`}>
              {s.label}
            </button>
          ))}
          <button type="button" disabled={pending} onClick={() => applySector('cross_sector')} className="rounded-lg border border-line-strong px-3 py-1.5 text-xs font-medium text-fg-body hover:border-brand disabled:opacity-50">
            Cross-sector only
          </button>
        </div>
        {notice && <p className="mt-3 text-xs text-status-approved">{notice}</p>}
        {error && <p className="mt-3 text-xs text-status-rejected">{error}</p>}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line bg-ink-raised p-0.5">
          <button type="button" onClick={() => setSubject('person')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${subject === 'person' ? 'bg-brand/15 text-fg-accent' : 'text-fg-muted hover:text-fg'}`}>People</button>
          <button type="button" onClick={() => setSubject('organisation')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${subject === 'organisation' ? 'bg-brand/15 text-fg-accent' : 'text-fg-muted hover:text-fg'}`}>Organisation</button>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-line-strong bg-ink-raised px-3 py-1.5 text-xs text-fg">
          <option value="all">All sectors</option>
          <option value="enabled">Enabled only ({enabledCount})</option>
          {SECTOR_ORDER.filter((s) => s !== 'custom').map((s) => <option key={s} value={s}>{SECTOR_LABELS[s as keyof typeof SECTOR_LABELS]}</option>)}
          <option value="custom">Custom</option>
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search requirements" className="flex-1 min-w-[160px] rounded-lg border border-line-strong bg-ink-raised px-3 py-1.5 text-xs text-fg placeholder:text-fg-muted" />
      </div>

      {grouped.length === 0 && <p className="text-sm text-fg-muted">Nothing matches.</p>}

      {grouped.map(({ sector: s, types }) => (
        <section key={s}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2">{SECTOR_LABELS[s as keyof typeof SECTOR_LABELS] ?? 'Custom'} <span className="font-normal">({types.length})</span></h3>
          <div className="bg-ink-raised rounded-2xl border border-line divide-y divide-line overflow-hidden">
            {types.map((t) => {
              const req = reqByType.get(t.id)
              const enabled = !!req?.enabled
              const isOpen = open === t.id
              return (
                <div key={t.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={enabled} disabled={pending} onChange={(e) => toggle(t.id, e.target.checked)} className="mt-1 h-4 w-4 accent-brand" />
                    <button type="button" onClick={() => setOpen(isOpen ? null : t.id)} className="flex-1 min-w-0 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-fg">{t.name}</span>
                        <span className="rounded-full bg-ink-inset px-2 py-0.5 text-[11px] text-fg-muted">{CATEGORY_LABELS[t.category]}</span>
                        {t.work_blocking && <span className="text-[11px] font-semibold uppercase tracking-wide text-status-rejected/80">Required to work</span>}
                        {t.employer_id && <span className="text-[11px] text-fg-accent">Custom</span>}
                      </div>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {RENEWAL_RULE_LABELS[t.renewal_rule]}
                        {(t.renewal_rule === 'fixed_interval' || t.renewal_rule === 'employer_interval' || t.renewal_rule === 'status_check') && `, ${intervalLabel(req?.interval_months_override && !t.interval_locked ? req.interval_months_override : t.default_interval_months)}`}
                        {t.interval_locked && t.default_interval_months ? ' (set by the issuing body)' : ''}
                        {req?.applies_to === 'role_groups' && ' · role groups only'}
                      </p>
                    </button>
                    <span className="text-xs text-fg-muted">{isOpen ? 'Hide' : 'Details'}</span>
                  </div>

                  {isOpen && (
                    <div className="mt-3 ml-7 space-y-3">
                      {t.description && <p className="text-xs text-fg-body leading-relaxed">{t.description}</p>}
                      {t.statutory_basis && <p className="text-[11px] text-fg-muted">Basis: {t.statutory_basis}</p>}
                      {enabled && req && (
                        <ConfigForm type={t} requirement={req} roleGroups={roleGroups} onSaved={() => router.refresh()} />
                      )}
                      {!enabled && <p className="text-xs text-fg-muted">Tick the box to enable, then set the interval and who it applies to.</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function ConfigForm({ type, requirement, roleGroups, onSaved }: { type: RequirementType; requirement: EmployerRequirement; roleGroups: RoleGroup[]; onSaved: () => void }) {
  const [interval, setInterval] = useState<string>(requirement.interval_months_override ? String(requirement.interval_months_override) : '')
  const [leads, setLeads] = useState<string>((requirement.reminder_lead_days ?? [90, 30, 7]).join(', '))
  const [appliesTo, setAppliesTo] = useState<'all' | 'role_groups'>(requirement.applies_to)
  const [groups, setGroups] = useState<string[]>(requirement.role_group_ids ?? [])
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const hasInterval = type.renewal_rule === 'fixed_interval' || type.renewal_rule === 'employer_interval' || type.renewal_rule === 'status_check'
  const cls = 'rounded-lg border border-line-strong bg-ink-inset px-3 py-1.5 text-xs text-fg'

  function save() {
    setMsg(null)
    startTransition(async () => {
      const res = await updateRequirementConfig(type.id, {
        intervalMonthsOverride: interval ? Number(interval) : null,
        reminderLeadDays: leads.split(/[,\s]+/).filter(Boolean).map(Number),
        appliesTo,
        roleGroupIds: groups,
      })
      setMsg(res.error ?? 'Saved.')
      if (!res.error) onSaved()
    })
  }

  return (
    <div className="rounded-lg border border-line bg-ink-inset/50 p-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {hasInterval && (
          <div>
            <label className="block text-[11px] font-medium text-fg-body mb-1">Renewal interval (months)</label>
            {type.interval_locked ? (
              <p className="text-xs text-fg-muted">{type.default_interval_months} months, set by the issuing body</p>
            ) : (
              <input type="number" min={1} max={120} value={interval} onChange={(e) => setInterval(e.target.value)} placeholder={`Default ${type.default_interval_months ?? ''}`} className={`${cls} w-full`} />
            )}
          </div>
        )}
        <div>
          <label className="block text-[11px] font-medium text-fg-body mb-1">Remind at (days before)</label>
          <input value={leads} onChange={(e) => setLeads(e.target.value)} className={`${cls} w-full`} placeholder="90, 30, 7" />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-fg-body mb-1">Applies to</label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-fg-body"><input type="radio" checked={appliesTo === 'all'} onChange={() => setAppliesTo('all')} className="accent-brand" /> Everyone</label>
          <label className="flex items-center gap-1.5 text-xs text-fg-body"><input type="radio" checked={appliesTo === 'role_groups'} onChange={() => setAppliesTo('role_groups')} className="accent-brand" /> Only these role groups</label>
        </div>
        {appliesTo === 'role_groups' && (
          <div className="mt-2 flex flex-wrap gap-2">
            {roleGroups.length === 0 && <p className="text-xs text-fg-muted">Create role groups below first.</p>}
            {roleGroups.map((g) => (
              <label key={g.id} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs cursor-pointer ${groups.includes(g.id) ? 'border-brand bg-brand/15 text-fg-accent' : 'border-line text-fg-body'}`}>
                <input type="checkbox" className="hidden" checked={groups.includes(g.id)} onChange={(e) => setGroups((cur) => (e.target.checked ? [...cur, g.id] : cur.filter((x) => x !== g.id)))} />
                {g.name}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" disabled={pending} onClick={save} className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-60">Save</button>
        {msg && <span className={`text-xs ${msg === 'Saved.' ? 'text-status-approved' : 'text-status-rejected'}`}>{msg}</span>}
      </div>
    </div>
  )
}
