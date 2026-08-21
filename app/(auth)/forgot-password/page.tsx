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
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1.5">
            Check your email
          </h1>
          <p className="text-[15px] text-slate-500">
            If an account exists for that address, we&apos;ve sent a link to reset your
            password.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
          <p className="text-sm text-slate-600 leading-relaxed">
            The link expires in 1 hour and works best opened in the same browser you
            requested it from. Didn&apos;t get it? Check your spam folder, or{' '}
            <button
              onClick={() => setState(null)}
              className="font-medium text-teal-700 hover:text-teal-800 transition"
            >
              try again
            </button>
            .
          </p>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-teal-700 hover:text-teal-800 transition">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1.5">
          Reset your password
        </h1>
        <p className="text-[15px] text-slate-500">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
        <form onSubmit={handleSubmit} className="space-y-4">
          {linkExpired && !state?.error && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-sm text-amber-700">
                That reset link is invalid or has expired. Request a new one below.
              </p>
            </div>
          )}

          {state?.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{state.error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="sarah@acme.co.uk"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-teal-700 hover:text-teal-800 transition">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading…</div>}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
