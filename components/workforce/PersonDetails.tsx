'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deletePerson, sendWorkforceInvite, setEmploymentStatus, updatePerson, type ActionResult } from '@/app/(employer)/workforce/actions'
import { formatDate } from '@/lib/compliance/format'
import type { Employment, RoleGroup } from '@/lib/compliance/types'

const cls = 'w-full rounded-lg border border-line-strong bg-ink-raised px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand'

export default function PersonDetails({ person, roleGroups, hasRecords }: { person: Employment; roleGroups: RoleGroup[]; hasRecords: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [state, setState] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)

  function run(fn: () => Promise<ActionResult>, onOk?: string) {
    setState(null)
    setNotice(null)
    startTransition(async () => {
      const res = await fn()
      setState(res)
      if (res.success) {
        if (onOk) setNotice(onOk)
        router.refresh()
      }
    })
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await updatePerson(person.id, null, formData)
      setState(res)
      if (res.success) {
        setEditing(false)
        router.refresh()
      }
    })
  }

  const groupNames = (person.role_group_ids ?? []).map((id) => roleGroups.find((g) => g.id === id)?.name).filter(Boolean)

  return (
    <div className="bg-ink-raised rounded-2xl border border-line shadow-sm">
      <div className="px-5 py-4 border-b border-line flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-fg">Details</h2>
          <p className="text-xs text-fg-muted mt-0.5">
            {person.status === 'leaver' ? `Left ${formatDate(person.end_date) || 'date unknown'}` : person.employee_id ? 'Has Vopria access' : person.invited_at ? `Invited ${formatDate(person.invited_at.slice(0, 10))}, not yet accepted` : 'No Vopria login yet'}
          </p>
        </div>
        {!editing && <button type="button" onClick={() => { setState(null); setEditing(true) }} className="text-xs font-medium text-fg-accent hover:text-fg">Edit</button>}
      </div>

      <div className="px-5 py-4 space-y-3">
        {state?.error && (
          <div className="rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-3 py-2">
            <p className="text-sm text-status-rejected">{state.error}</p>
          </div>
        )}
        {notice && (
          <div className="rounded-lg border border-status-approved/30 bg-status-approved/10 px-3 py-2">
            <p className="text-sm text-status-approved">{notice}</p>
          </div>
        )}

        {editing ? (
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-fg-body mb-1">Full name</label>
                <input name="full_name" defaultValue={person.full_name} required className={cls} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-fg-body mb-1">Email</label>
                <input name="email" type="email" defaultValue={person.email ?? ''} className={cls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-body mb-1">Job title</label>
                <input name="job_title" defaultValue={person.job_title ?? ''} className={cls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-body mb-1">Department</label>
                <input name="department" defaultValue={person.department ?? ''} className={cls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-body mb-1">Start date</label>
                <input name="start_date" type="date" defaultValue={person.start_date ?? ''} className={cls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-body mb-1">Date of birth</label>
                <input name="date_of_birth" type="date" defaultValue={person.date_of_birth ?? ''} className={cls} />
              </div>
            </div>
            {roleGroups.length > 0 && (
              <div>
                <p className="text-xs font-medium text-fg-body mb-1.5">Role groups</p>
                <div className="flex flex-wrap gap-2">
                  {roleGroups.map((g) => (
                    <label key={g.id} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-fg-body cursor-pointer">
                      <input type="checkbox" name="role_group_ids" value={g.id} defaultChecked={person.role_group_ids?.includes(g.id)} className="accent-brand" />
                      {g.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 text-sm text-fg-body">Cancel</button>
              <button type="submit" disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save</button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm">
            <div><dt className="text-xs text-fg-muted">Email</dt><dd className="text-fg-body">{person.email ?? 'Not set'}</dd></div>
            <div><dt className="text-xs text-fg-muted">Job title</dt><dd className="text-fg-body">{person.job_title ?? 'Not set'}</dd></div>
            <div><dt className="text-xs text-fg-muted">Department</dt><dd className="text-fg-body">{person.department ?? 'Not set'}</dd></div>
            <div><dt className="text-xs text-fg-muted">Start date</dt><dd className="text-fg-body">{formatDate(person.start_date) || 'Not set'}</dd></div>
            <div><dt className="text-xs text-fg-muted">Date of birth</dt><dd className="text-fg-body">{formatDate(person.date_of_birth) || 'Not set'}</dd></div>
            <div><dt className="text-xs text-fg-muted">Role groups</dt><dd className="text-fg-body">{groupNames.length > 0 ? groupNames.join(', ') : 'None'}</dd></div>
          </dl>
        )}

        {!editing && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
            {person.status === 'active' && !person.employee_id && person.email && (
              <button type="button" disabled={pending} onClick={() => run(() => sendWorkforceInvite(person.id), `Invitation sent to ${person.email}.`)} className="rounded-md bg-brand/15 px-3 py-1.5 text-xs font-semibold text-fg-accent hover:bg-brand/25 disabled:opacity-50">
                {person.invited_at ? 'Resend invite' : 'Invite to Vopria'}
              </button>
            )}
            {person.status === 'active' ? (
              <button type="button" disabled={pending} onClick={() => { if (confirm(`Mark ${person.full_name} as a leaver? Their records are kept but they stop counting towards your headcount.`)) run(() => setEmploymentStatus(person.id, 'leaver')) }} className="rounded-md border border-line-strong px-3 py-1.5 text-xs font-medium text-fg-body hover:bg-ink-raised-hover disabled:opacity-50">
                Mark as leaver
              </button>
            ) : (
              <button type="button" disabled={pending} onClick={() => run(() => setEmploymentStatus(person.id, 'active'))} className="rounded-md border border-line-strong px-3 py-1.5 text-xs font-medium text-fg-body hover:bg-ink-raised-hover disabled:opacity-50">
                Reactivate
              </button>
            )}
            {!hasRecords && (
              <button type="button" disabled={pending} onClick={() => { if (confirm(`Delete ${person.full_name}? This cannot be undone.`)) startTransition(async () => { const res = await deletePerson(person.id); if (res.error) setState(res); else router.push('/workforce') }) }} className="rounded-md border border-status-rejected/30 px-3 py-1.5 text-xs font-medium text-status-rejected hover:bg-status-rejected/10 disabled:opacity-50">
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
