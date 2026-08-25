'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updatePassword, type ResetPasswordState } from './actions'

export default function ResetPasswordForm() {
  const [state, setState] = useState<ResetPasswordState | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updatePassword(formData)
      setState(result)
    })
  }

  if (state?.success) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-fg tracking-tight mb-1.5">
            Password updated
          </h1>
          <p className="text-[15px] text-fg-muted">
            Your password has been changed successfully.
          </p>
        </div>

        <div className="bg-ink-raised rounded-2xl border border-line shadow-sm p-7">
          <Link
            href="/login"
            className="block w-full text-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
          >
            Continue to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-fg tracking-tight mb-1.5">
          Choose a new password
        </h1>
        <p className="text-[15px] text-fg-muted">Must be at least 8 characters.</p>
      </div>

      <div className="bg-ink-raised rounded-2xl border border-line shadow-sm p-7">
        <form onSubmit={handleSubmit} className="space-y-4">
          {state?.error && (
            <div className="rounded-lg bg-status-rejected/10 border border-status-rejected/30 px-4 py-3">
              <p className="text-sm text-status-rejected">{state.error}</p>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-fg-body mb-1.5">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full rounded-lg border border-line-strong bg-ink-raised px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-fg-body mb-1.5"
            >
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full rounded-lg border border-line-strong bg-ink-raised px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-ink disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
