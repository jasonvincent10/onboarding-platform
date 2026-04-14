'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { grantConsentsForOnboarding } from './actions'
import type { DataCategory } from '@/lib/consent'

interface CategoryRow {
  key: DataCategory
  label: string
  description: string
}

interface Props {
  onboardingId: string
  categories: CategoryRow[]
}

export default function ConsentGateForm({ onboardingId, categories }: Props) {
  const router = useRouter()
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const allChecked = categories.every((c) => checked[c.key] === true)

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await grantConsentsForOnboarding(
        onboardingId,
        categories.map((c) => c.key)
      )
      if (result.error) {
        setError(result.error)
        return
      }
      router.push(`/employee/onboarding/${onboardingId}`)
      router.refresh()
    })
  }

  return (
    <div className="mt-8">
      <ul className="space-y-3">
        {categories.map((c) => (
          <li
            key={c.key}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: '#ffffff',
            }}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checked[c.key] === true}
                onChange={() => toggle(c.key)}
                style={{ marginTop: '4px', width: '18px', height: '18px' }}
              />
              <span>
                <span style={{ display: 'block', fontWeight: 600, color: '#111827' }}>
                  {c.label}
                </span>
                <span style={{ display: 'block', fontSize: '14px', color: '#4b5563', marginTop: '2px' }}>
                  {c.description}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-4 text-sm text-red-600">
          Something went wrong: {error}. Please try again.
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!allChecked || isPending}
        style={{
          marginTop: '24px',
          width: '100%',
          padding: '12px 16px',
          borderRadius: '8px',
          fontWeight: 600,
          color: '#ffffff',
          backgroundColor: !allChecked || isPending ? '#9ca3af' : '#111827',
          cursor: !allChecked || isPending ? 'not-allowed' : 'pointer',
          border: 'none',
        }}
      >
        {isPending ? 'Saving…' : 'Grant consent and continue'}
      </button>

      <p className="mt-3 text-xs text-gray-500">
        You must consent to all of the above to continue. If you&apos;re not
        comfortable sharing any of this information, please contact your
        employer directly.
      </p>
    </div>
  )
}