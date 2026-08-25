'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { loginEmployee, signUpEmployee } from './actions'

function EmployeeLoginForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  // With an invite token, default to signup (new starter). Without one,
  // this is a returning employee visiting directly to check on an existing
  // onboarding, so default to login.
  const [mode, setMode] = useState<'login' | 'signup'>(token ? 'signup' : 'login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set('token', token)

    const action = mode === 'signup' ? signUpEmployee : loginEmployee
    const result = await action(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success the server action redirects to /join?token=... which then
    // runs acceptInvitation() and forwards to the checklist
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-1.5 text-2xl font-semibold tracking-tight text-fg">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-[15px] text-fg-muted">
          {mode === 'signup'
            ? 'Set up your secure profile to complete your onboarding.'
            : token
              ? 'Sign in to continue your onboarding.'
              : 'Sign in to view your onboardings.'}
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-ink-raised p-7 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-4 py-3">
              <p className="text-sm text-status-rejected">{error}</p>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label
                htmlFor="full_name"
                className="mb-1.5 block text-sm font-medium text-fg-body"
              >
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                autoComplete="name"
                placeholder="Jane Smith"
                className="w-full rounded-lg border border-line-strong bg-ink-raised px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-fg-body"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="jane@example.com"
              className="w-full rounded-lg border border-line-strong bg-ink-raised px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-fg-body"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              minLength={8}
              className="w-full rounded-lg border border-line-strong bg-ink-raised px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
            {mode === 'signup' && (
              <p className="mt-1 text-xs text-fg-muted">Minimum 8 characters.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? mode === 'signup'
                ? 'Creating account…'
                : 'Signing in…'
              : mode === 'signup'
                ? 'Create account & continue'
                : 'Sign in & continue'}
          </button>
        </form>
      </div>

      {token ? (
        <p className="mt-5 text-center text-sm text-fg-muted">
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setMode(mode === 'signup' ? 'login' : 'signup')
              setError(null)
            }}
            className="font-medium text-fg-accent transition hover:text-fg"
          >
            {mode === 'signup' ? 'Sign in instead' : 'Create one'}
          </button>
        </p>
      ) : (
        // No token means signup can't succeed (there's nothing to attach a
        // new account to), so don't offer a toggle that dead-ends in a
        // confusing redirect -- point them at the actual next step instead.
        <p className="mt-5 text-center text-sm text-fg-muted">
          New here? You&apos;ll need an invitation from your employer to create an
          account.
        </p>
      )}
    </div>
  )
}

export default function EmployeeLoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-fg-muted">Loading…</div>}>
      <EmployeeLoginForm />
    </Suspense>
  )
}