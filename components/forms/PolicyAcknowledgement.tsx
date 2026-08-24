'use client'

import { useState } from 'react'
import { acknowledgePolicy } from '@/lib/actions/policy-actions'
import { useRouter } from 'next/navigation'

interface PolicyAcknowledgementProps {
  checklistItemId: string
  onboardingId: string
  itemName: string
  description: string | null
  policyDocumentUrl: string | null
  alreadyAcknowledged: boolean
  acknowledgedAt: string | null
}

export default function PolicyAcknowledgement({
  checklistItemId,
  onboardingId,
  itemName,
  description,
  policyDocumentUrl,
  alreadyAcknowledged,
  acknowledgedAt,
}: PolicyAcknowledgementProps) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(alreadyAcknowledged)

  async function handleAcknowledge() {
    if (!checked) return
    setLoading(true)
    setError(null)
    const result = await acknowledgePolicy(checklistItemId, onboardingId)
    if (result.success) {
      setDone(true)
      router.push(`/employee/onboarding/${onboardingId}`)
    } else {
      setError(result.error ?? 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-emerald-800">Acknowledged</p>
        {acknowledgedAt && (
          <p className="mt-1 text-xs text-gray-500">
            Confirmed on {new Date(acknowledgedAt).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'})}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      {policyDocumentUrl ? (
        <div className="mb-6">
          <p className="mb-2 text-sm text-gray-500">Please read the document below before acknowledging.</p>
          <div className="overflow-hidden rounded-xl border border-gray-200" style={{height: '480px'}}>
            <iframe src={policyDocumentUrl} width="100%" height="100%" title={itemName} className="border-none" />
          </div>
        </div>
      ) : description ? (
        <div className="mb-6 max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
          {description}
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No policy content has been attached to this item yet. Contact your employer if you have questions.
        </div>
      )}

      <label className={`mb-5 flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition-colors ${checked ? 'border-violet-300 bg-violet-50' : 'border-gray-200 bg-white'}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-violet-600"
        />
        <span className="text-sm leading-relaxed text-gray-700">
          I confirm that I have read and understood the <strong>{itemName}</strong> and agree to its terms.
        </span>
      </label>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleAcknowledge}
        disabled={!checked || loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Recording acknowledgement...
          </>
        ) : 'I Acknowledge'}
      </button>
    </div>
  )
}