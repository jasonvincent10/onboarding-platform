'use client'

import { useState } from 'react'

export default function BillingPortalButton() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openPortal() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Could not open billing portal. Please try again.')
        setBusy(false)
      }
    } catch {
      setError('Could not open billing portal. Please check your connection.')
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={openPortal}
        disabled={busy}
        className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {busy ? 'Opening…' : 'Manage billing'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
