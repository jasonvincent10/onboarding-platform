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
      <div className="rounded-xl border border-status-approved/30 bg-status-approved/10 px-6 py-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-status-approved/15">
          <svg className="h-5 w-5 text-status-approved" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-status-approved">Acknowledged</p>
        {acknowledgedAt && (
          <p className="mt-1 text-xs text-fg-muted">
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
          <p className="mb-2 text-sm text-fg-muted">Please read the document below before acknowledging.</p>
          <div className="overflow-hidden rounded-xl border border-line" style={{height: '480px'}}>
            <iframe src={policyDocumentUrl} width="100%" height="100%" title={itemName} className="border-none" />
          </div>
        </div>
      ) : description ? (
        <div className="mb-6 max-h-96 overflow-y-auto rounded-xl border border-line bg-ink-inset px-5 py-4 text-sm leading-relaxed text-fg-body whitespace-pre-wrap">
          {description}
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-status-pending/30 bg-status-pending/10 px-4 py-3 text-sm text-status-pending">
          No policy content has been attached to this item yet. Contact your employer if you have questions.
        </div>
      )}

      <label className={`mb-5 flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition-colors ${checked ? 'border-brand/40 bg-brand/10' : 'border-line bg-ink-raised'}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong text-fg-accent"
        />
        <span className="text-sm leading-relaxed text-fg-body">
          I confirm that I have read and understood the <strong>{itemName}</strong> and agree to its terms.
        </span>
      </label>

      {error && (
        <div className="mb-4 rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-4 py-3 text-sm text-status-rejected">
          {error}
        </div>
      )}

      <button
        onClick={handleAcknowledge}
        disabled={!checked || loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
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