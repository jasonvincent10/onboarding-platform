'use client'

import { useState, useTransition } from 'react'
import { revokeInvitation } from './actions'

export default function RevokeInviteButton({ invitationId }: { invitationId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleRevoke() {
    setError(null)
    startTransition(async () => {
      const result = await revokeInvitation(invitationId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-status-rejected">{error}</span>}
      <button
        type="button"
        onClick={handleRevoke}
        disabled={isPending}
        className="text-xs font-medium text-fg-muted hover:text-status-rejected disabled:opacity-60 transition"
      >
        {isPending ? 'Revoking…' : 'Revoke'}
      </button>
    </div>
  )
}
