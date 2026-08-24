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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl">
      <div className="px-6 py-5 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800">Company profile</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          This name appears on invitation emails sent to new starters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {state?.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        )}
        {state?.success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
            <p className="text-sm text-emerald-700">Saved.</p>
          </div>
        )}

        <div>
          <label htmlFor="company_name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Company name
          </label>
          <input
            id="company_name"
            name="company_name"
            type="text"
            required
            defaultValue={companyName}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-600/10 focus:border-violet-600"
          />
        </div>

        <div>
          <label htmlFor="company_number" className="block text-sm font-medium text-slate-700 mb-1.5">
            Companies House number
            <span className="ml-1.5 text-xs font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="company_number"
            name="company_number"
            type="text"
            defaultValue={companyNumber}
            placeholder="e.g. 12345678"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600/10 focus:border-violet-600"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
