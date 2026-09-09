'use client'

// Role groups manager + custom requirement creator for the settings page.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORY_LABELS, RENEWAL_RULE_LABELS, type RenewalRule, type RequirementCategory, type RequirementType, type RoleGroup } from '@/lib/compliance/types'
import { createCustomRequirement, createRoleGroup, deleteCustomRequirement, deleteRoleGroup } from '@/app/(employer)/compliance/settings/actions'

const cls = 'w-full rounded-lg border border-line-strong bg-ink-raised px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand/20'

export function RoleGroupsManager({ roleGroups }: { roleGroups: RoleGroup[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="bg-ink-raised rounded-2xl border border-line">
      <div className="px-5 py-4 border-b border-line">
        <h3 className="text-sm font-semibold text-fg">Role groups</h3>
        <p className="text-xs text-fg-muted mt-0.5">Scope requirements to the people who need them: Drivers, Kitchen, Site staff, Door team. Assign people to groups on their page or in the CSV.</p>
      </div>
      <div className="px-5 py-4 space-y-3">
        {error && <p className="text-xs text-status-rejected">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {roleGroups.length === 0 && <p className="text-xs text-fg-muted">No groups yet.</p>}
          {roleGroups.map((g) => (
            <span key={g.id} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-fg-body">
              {g.name}
              <button type="button" disabled={pending} onClick={() => { if (confirm(`Delete the ${g.name} group? People stay, requirements scoped only to this group stop applying to them.`)) startTransition(async () => { const r = await deleteRoleGroup(g.id); if (r.error) setError(r.error); else router.refresh() }) }} className="text-fg-muted hover:text-status-rejected" aria-label={`Delete ${g.name}`}>x</button>
            </span>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            startTransition(async () => {
              const r = await createRoleGroup(name)
              if (r.error) setError(r.error)
              else {
                setName('')
                router.refresh()
              }
            })
          }}
          className="flex gap-2"
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New group name" className={cls} />
          <button type="submit" disabled={pending || !name.trim()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60 whitespace-nowrap">Add group</button>
        </form>
      </div>
    </div>
  )
}

export function CustomRequirements({ custom }: { custom: RequirementType[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'training' as RequirementCategory,
    subject: 'person' as 'person' | 'organisation',
    renewalRule: 'employer_interval' as RenewalRule,
    intervalMonths: '12',
    workBlocking: false,
    evidenceRequired: true,
    referenceLabel: '',
  })
  const needsInterval = ['fixed_interval', 'employer_interval', 'status_check'].includes(form.renewalRule)

  return (
    <div className="bg-ink-raised rounded-2xl border border-line">
      <div className="px-5 py-4 border-b border-line flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">Custom requirements</h3>
          <p className="text-xs text-fg-muted mt-0.5">Anything the library does not cover: a client-specific induction, an internal competency, a local authority permit.</p>
        </div>
        <button type="button" onClick={() => { setError(null); setOpen(!open) }} className="text-xs font-medium text-fg-accent hover:text-fg whitespace-nowrap">{open ? 'Close' : 'Add custom'}</button>
      </div>
      <div className="px-5 py-4 space-y-3">
        {custom.length > 0 && (
          <ul className="divide-y divide-line">
            {custom.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="text-sm text-fg">{t.name}</p>
                  <p className="text-xs text-fg-muted">{CATEGORY_LABELS[t.category]} · {RENEWAL_RULE_LABELS[t.renewal_rule]}{t.default_interval_months ? `, ${t.default_interval_months} months` : ''}</p>
                </div>
                <button type="button" disabled={pending} onClick={() => { if (confirm(`Delete ${t.name}? All records against it will be removed.`)) startTransition(async () => { const r = await deleteCustomRequirement(t.id); if (r.error) setError(r.error); else router.refresh() }) }} className="text-xs text-fg-muted hover:text-status-rejected">Delete</button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-xs text-status-rejected">{error}</p>}
        {open && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              startTransition(async () => {
                const r = await createCustomRequirement({
                  name: form.name,
                  description: form.description,
                  category: form.category,
                  subject: form.subject,
                  renewalRule: form.renewalRule,
                  intervalMonths: needsInterval ? Number(form.intervalMonths) : null,
                  workBlocking: form.workBlocking,
                  evidenceRequired: form.evidenceRequired,
                  referenceLabel: form.referenceLabel,
                })
                if (r.error) setError(r.error)
                else {
                  setOpen(false)
                  setForm((f) => ({ ...f, name: '', description: '', referenceLabel: '' }))
                  router.refresh()
                }
              })
            }}
            className="space-y-3 rounded-lg border border-line bg-ink-inset/50 p-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-fg-body mb-1">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={cls} required />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-fg-body mb-1">Description <span className="text-fg-muted font-normal">(optional)</span></label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={cls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-body mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as RequirementCategory })} className={cls}>
                  {(Object.keys(CATEGORY_LABELS) as RequirementCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-body mb-1">Applies to</label>
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value as 'person' | 'organisation' })} className={cls}>
                  <option value="person">A person</option>
                  <option value="organisation">The organisation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-body mb-1">How it renews</label>
                <select value={form.renewalRule} onChange={(e) => setForm({ ...form, renewalRule: e.target.value as RenewalRule })} className={cls}>
                  {(['employer_interval', 'document_date', 'no_expiry', 'status_check', 'event_based'] as RenewalRule[]).map((r) => <option key={r} value={r}>{RENEWAL_RULE_LABELS[r]}</option>)}
                </select>
              </div>
              {needsInterval && (
                <div>
                  <label className="block text-xs font-medium text-fg-body mb-1">Interval (months)</label>
                  <input type="number" min={1} max={120} value={form.intervalMonths} onChange={(e) => setForm({ ...form, intervalMonths: e.target.value })} className={cls} />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-fg-body mb-1">Reference label <span className="text-fg-muted font-normal">(optional, e.g. Permit number)</span></label>
                <input value={form.referenceLabel} onChange={(e) => setForm({ ...form, referenceLabel: e.target.value })} className={cls} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs text-fg-body"><input type="checkbox" checked={form.evidenceRequired} onChange={(e) => setForm({ ...form, evidenceRequired: e.target.checked })} className="accent-brand" /> Evidence required</label>
              <label className="flex items-center gap-2 text-xs text-fg-body"><input type="checkbox" checked={form.workBlocking} onChange={(e) => setForm({ ...form, workBlocking: e.target.checked })} className="accent-brand" /> Required to work (escalate immediately when lapsed)</label>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">Create requirement</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
