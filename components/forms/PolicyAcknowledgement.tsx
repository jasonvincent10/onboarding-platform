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
      <div style={{ border: '1px solid #d1fae5', backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
        <p style={{ fontWeight: 600, color: '#166534', marginBottom: '4px' }}>Acknowledged</p>
        {acknowledgedAt && (
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Confirmed on{' '}
            {new Date(acknowledgedAt).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      {policyDocumentUrl ? (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '8px' }}>
            Please read the document below before acknowledging.
          </p>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', height: '480px' }}>
            <iframe src={policyDocumentUrl} width="100%" height="100%" title={itemName} style={{ border: 'none' }} />
          </div>
        </div>
      ) : description ? (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', backgroundColor: '#f9fafb', marginBottom: '24px', maxHeight: '400px', overflowY: 'auto', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontSize: '0.9375rem', color: '#374151' }}>
          {description}
        </div>
      ) : (
        <div style={{ border: '1px solid #fde68a', backgroundColor: '#fffbeb', borderRadius: '8px', padding: '16px', marginBottom: '24px', fontSize: '0.875rem', color: '#92400e' }}>
          No policy content has been attached to this item yet. Contact your employer if you have questions.
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', marginBottom: '20px', padding: '16px', border: checked ? '1px solid #a5b4fc' : '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: checked ? '#eef2ff' : '#ffffff' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
        />
        <span style={{ fontSize: '0.9375rem', color: '#374151', lineHeight: '1.5' }}>
          I confirm that I have read and understood the <strong>{itemName}</strong> and agree to its terms.
        </span>
      </label>

      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <button
        onClick={handleAcknowledge}
        disabled={!checked || loading}
        style={{ width: '100%', padding: '12px 24px', backgroundColor: checked && !loading ? '#4f46e5' : '#e5e7eb', color: checked && !loading ? '#ffffff' : '#9ca3af', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '1rem', cursor: checked && !loading ? 'pointer' : 'not-allowed' }}
      >
        {loading ? 'Recording acknowledgement...' : 'I Acknowledge'}
      </button>
    </div>
  )
}