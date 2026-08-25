'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from '@/lib/actions/auth'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, login() redirects
  }

  return (
    <div>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-fg tracking-tight mb-1.5">
          Welcome back
        </h1>
        <p className="text-[15px] text-fg-muted">Sign in to your employer dashboard.</p>
      </div>

      {/* Form card */}
      <div className="bg-ink-raised rounded-2xl border border-line shadow-sm p-7">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error banner */}
          {error && (
            <div className="rounded-lg bg-status-rejected/10 border border-status-rejected/30 px-4 py-3">
              <p className="text-sm text-status-rejected">{error}</p>
            </div>
          )}

          {/* Email */}
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

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-fg-body mb-1.5">
              <span className="flex items-center justify-between">
                Password
                <Link
                  href="/forgot-password"
                  className="text-xs font-normal text-fg-accent hover:text-fg transition"
                >
                  Forgot password?
                </Link>
              </span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-line-strong bg-ink-raised px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-ink disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      {/* Sign up link */}
      <p className="mt-5 text-center text-sm text-fg-muted">
        New to Vopria?{' '}
        <Link href="/sign-up" className="font-medium text-fg-accent hover:text-fg transition">
          Create an account
        </Link>
      </p>

      {/* Wrong login for employees */}
      <p className="mt-2 text-center text-xs text-fg-muted">
        Completing your own onboarding?{' '}
        <Link href="/employee-login" className="font-medium text-fg-accent hover:text-fg transition">
          Sign in here instead
        </Link>
      </p>
    </div>
  )
}
