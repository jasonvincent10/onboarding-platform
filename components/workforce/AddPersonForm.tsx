'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addPerson, type ActionResult } from '@/app/(employer)/workforce/actions'
import type { RoleGroup } from '@/lib/compliance/types'
import Modal from '@/components/compliance/Modal'

const cls = 'w-full rounded-lg border border-line-strong bg-ink-raised px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand'

export default function AddPersonForm({ roleGroups }: { roleGroups: RoleGroup[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await addPerson(null, formData)
      setState(result)
      if (result.success) {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <button type="button" onClick={() => { setState(null); setOpen(true) }} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="white" strokeWidth="2" strokeLinecap="round" /></svg>
        Add person
      </button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-fg">Add someone to your workforce</h3>
            <p className="mt-1 text-xs text-fg-muted">They do not need a Vopria login. You can invite them later so they can upload their own renewals.</p>
          </div>
          {state?.error && (
            <div className="rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-3 py-2">
              <p className="text-sm text-status-rejected">{state.error}</p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-fg-body mb-1">Full name <span className="text-status-rejected">*</span></label>
              <input name="full_name" required className={cls} autoFocus />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-fg-body mb-1">Email</label>
              <input name="email" type="email" className={cls} placeholder="Needed for reminders and self-service" />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-body mb-1">Job title</label>
              <input name="job_title" className={cls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-body mb-1">Department or team</label>
              <input name="department" className={cls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-body mb-1">Start date</label>
              <input name="start_date" type="date" className={cls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-body mb-1">Date of birth <span className="text-fg-muted font-normal">(for driver medicals)</span></label>
              <input name="date_of_birth" type="date" className={cls} />
            </div>
          </div>
          {roleGroups.length > 0 && (
            <div>
              <p className="text-xs font-medium text-fg-body mb-1.5">Role groups</p>
              <div className="flex flex-wrap gap-2">
                {roleGroups.map((g) => (
                  <label key={g.id} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-fg-body hover:border-line-strong cursor-pointer">
                    <input type="checkbox" name="role_group_ids" value={g.id} className="accent-brand" />
                    {g.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="px-3.5 py-2 text-sm font-medium text-fg-body hover:text-fg">Cancel</button>
            <button type="submit" disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">{pending ? 'Adding...' : 'Add person'}</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
