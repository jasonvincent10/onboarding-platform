'use client'

import { Suspense, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { requestPasswordReset, type ForgotPasswordState } from './actions'

function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const linkExpired = searchParams.get('error') === 'link_expired'

  const [state, setState] = useState<ForgotPasswordState | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await requestPasswordReset(formData)
      setState(result)
    })
  }

  if (state?.success) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-fg tracking-tight mb-1.5">
            Check your email
          </h1>
          <p className="text-[15px] text-fg-muted">
            If an account exists for that address, we&apos;ve sent a link to reset your
            password.
          </p>
        </div>

        <div className="bg-ink-raised rounded-2xl border border-line shadow-sm p-7">
          <p className="text-sm text-fg-body leading-relaxed">
            The link expires in 1 hour and works best opened in the same browser you
            requested it from. Didn&apos;t get it? Check your spam folder, or{' '}
            <button
              onClick={() => setState(null)}
              className="font-medium text-fg-accent hover:text-fg transition"
            >
              try again
            </button>
            .
          </p>
        </div>

        <p className="mt-5 text-center text-sm text-fg-muted">
          <Link href="/login" className="font-medium text-fg-accent hover:text-fg transition">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-fg tracking-tight mb-1.5">
          Reset your password
        </h1>
        <p className="text-[15px] text-fg-muted">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>

      <div className="bg-ink-raised rounded-2xl border border-line shadow-sm p-7">
        <form onSubmit={handleSubmit} className="space-y-4">
          {linkExpired && !state?.error && (
            <div className="rounded-lg bg-status-pending/10 border border-status-pending/30 px-4 py-3">
              <p className="text-sm text-status-pending">
                That reset link is invalid or has expired. Request a new one below.
              </p>
            </div>
          )}

          {state?.error && (
            <div className="rounded-lg bg-status-rejected/10 border border-status-rejected/30 px-4 py-3">
              <p className="text-sm text-status-rejected">{state.error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-fg-body mb-1.5">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="sarah@acme.co.uk"
              className="w-full rounded-lg border border-line-strong bg-ink-raised px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-ink disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-fg-muted">
        <Link href="/login" className="font-medium text-fg-accent hover:text-fg transition">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-fg-muted">Loading…</div>}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
