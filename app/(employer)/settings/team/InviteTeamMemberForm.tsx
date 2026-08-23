'use client'

import { useState, useTransition } from 'react'
import { inviteTeamMember, type InviteTeamMemberState } from './actions'

export default function InviteTeamMemberForm() {
  const [state, setState] = useState<InviteTeamMemberState | null>(null)
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await inviteTeamMember(null, formData)
      setState(result)
      if (result.success) {
        e.currentTarget.reset()
        setOpen(false)
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setState(null) }}
        className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 transition"
      >
        Invite team member
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="colleague@company.co.uk"
          className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isPending ? 'Sending…' : 'Send invite'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-white transition"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
