'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { loginEmployee, signUpEmployee } from './actions'

function EmployeeLoginForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [mode, setMode] = useState<'login' | 'signup'>('signup')
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
        <h1 className="mb-1.5 text-2xl font-semibold tracking-tight text-slate-900">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-[15px] text-slate-500">
          {mode === 'signup'
            ? 'Set up your secure profile to complete your onboarding.'
            : 'Sign in to continue your onboarding.'}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label
                htmlFor="full_name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
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
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
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
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
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
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
            />
            {mode === 'signup' && (
              <p className="mt-1 text-xs text-slate-400">Minimum 8 characters.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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

      <p className="mt-5 text-center text-sm text-slate-500">
        {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          onClick={() => {
            setMode(mode === 'signup' ? 'login' : 'signup')
            setError(null)
          }}
          className="font-medium text-teal-700 transition hover:text-teal-800"
        >
          {mode === 'signup' ? 'Sign in instead' : 'Create one'}
        </button>
      </p>
    </div>
  )
}

export default function EmployeeLoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading…</div>}>
      <EmployeeLoginForm />
    </Suspense>
  )
}