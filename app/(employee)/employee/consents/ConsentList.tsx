'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { withdrawConsentForEmployer } from '../onboarding/[id]/consent/actions'
import type { DataCategory } from '@/lib/consent'

interface CategoryRow {
  key: DataCategory
  label: string
  action: 'granted' | 'withdrawn'
  changedAt: string
}

interface EmployerRow {
  employerId: string
  companyName: string
  categories: CategoryRow[]
}

export default function ConsentList({ employers }: { employers: EmployerRow[] }) {
  const router = useRouter()
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleWithdraw = (employerId: string, category: DataCategory) => {
    const key = `${employerId}:${category}`
    if (!confirm('Withdraw consent for this data category? The employer will no longer be able to access it.')) {
      return
    }
    setBusyKey(key)
    startTransition(async () => {
      const result = await withdrawConsentForEmployer(employerId, category)
      setBusyKey(null)
      if (result.error) {
        alert(`Failed to withdraw: ${result.error}`)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mt-8 space-y-6">
      {employers.map((emp) => (
        <div
          key={emp.employerId}
          style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', backgroundColor: '#ffffff' }}
        >
          <h2 className="text-lg font-semibold text-gray-900">{emp.companyName}</h2>
          <ul className="mt-4 space-y-2">
            {emp.categories.map((c) => {
              const key = `${emp.employerId}:${c.key}`
              const busy = busyKey === key && isPending
              return (
                <li
                  key={c.key}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #f3f4f6' }}
                >
                  <div>
                    <div style={{ fontWeight: 500, color: '#111827' }}>{c.label}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {c.action === 'granted' ? 'Granted' : 'Withdrawn'} on{' '}
                      {new Date(c.changedAt).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  {c.action === 'granted' ? (
                    <button
                      type="button"
                      onClick={() => handleWithdraw(emp.employerId, c.key)}
                      disabled={busy}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: '#b91c1c',
                        backgroundColor: '#ffffff',
                        border: '1px solid #fecaca',
                        cursor: busy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {busy ? 'Withdrawing…' : 'Withdraw'}
                    </button>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>No access</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}