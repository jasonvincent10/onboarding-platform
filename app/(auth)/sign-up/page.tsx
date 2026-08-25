'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signUp } from '@/lib/actions/auth'

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await signUp(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, signUp() redirects — no further action needed
  }

  return (
    <div>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-fg tracking-tight mb-1.5">
          Set up your account
        </h1>
        <p className="text-[15px] text-fg-muted">
          Start onboarding your team the right way.{' '}
          <span className="text-fg-body font-medium">First 3 hires are free.</span>
        </p>
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

          {/* Full name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-fg-body mb-1.5">
              Your name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              placeholder="Sarah Johnson"
              className="w-full rounded-lg border border-line-strong bg-ink-raised px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          {/* Company name */}
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-fg-body mb-1.5">
              Company name
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              autoComplete="organization"
              required
              placeholder="Acme Ltd"
              className="w-full rounded-lg border border-line-strong bg-ink-raised px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-fg-body mb-1.5">
              Work email
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
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-line-strong bg-ink-raised px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-ink disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        {/* Legal small print */}
        <p className="mt-4 text-xs text-center text-fg-muted leading-relaxed">
          By creating an account you agree to our{' '}
          <Link href="/legal/terms" className="underline hover:text-fg-body transition">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="underline hover:text-fg-body transition">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      {/* Sign in link */}
      <p className="mt-5 text-center text-sm text-fg-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-fg-accent hover:text-fg transition">
          Sign in
        </Link>
      </p>
    </div>
  )
}
