'use client'

import { useState, useTransition } from 'react'
import { updateCompanyProfile, type UpdateCompanyState } from './actions'

interface Props {
  companyName: string
  companyNumber: string
}

export default function CompanyProfileForm({ companyName, companyNumber }: Props) {
  const [state, setState] = useState<UpdateCompanyState | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateCompanyProfile(null, formData)
      setState(result)
    })
  }

  return (
    <div className="bg-ink-raised rounded-2xl border border-line shadow-sm max-w-xl">
      <div className="px-6 py-5 border-b border-line">
        <h2 className="text-sm font-semibold text-fg">Company profile</h2>
        <p className="text-sm text-fg-muted mt-0.5">
          This name appears on invitation emails sent to new starters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {state?.error && (
          <div className="rounded-lg bg-status-rejected/10 border border-status-rejected/30 px-4 py-3">
            <p className="text-sm text-status-rejected">{state.error}</p>
          </div>
        )}
        {state?.success && (
          <div className="rounded-lg bg-status-approved/10 border border-status-approved/30 px-4 py-3">
            <p className="text-sm text-status-approved">Saved.</p>
          </div>
        )}

        <div>
          <label htmlFor="company_name" className="block text-sm font-medium text-fg-body mb-1.5">
            Company name
          </label>
          <input
            id="company_name"
            name="company_name"
            type="text"
            required
            defaultValue={companyName}
            className="w-full rounded-lg border border-line-strong px-3.5 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand"
          />
        </div>

        <div>
          <label htmlFor="company_number" className="block text-sm font-medium text-fg-body mb-1.5">
            Companies House number
            <span className="ml-1.5 text-xs font-normal text-fg-muted">(optional)</span>
          </label>
          <input
            id="company_number"
            name="company_number"
            type="text"
            defaultValue={companyNumber}
            placeholder="e.g. 12345678"
            className="w-full rounded-lg border border-line-strong px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
