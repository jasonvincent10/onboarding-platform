'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUpForTeamInvite, loginForTeamInvite } from './actions'

interface Props {
  token: string
  inviteeEmail: string
  companyName: string
  alreadyAccepted: boolean
}

export default function TeamInviteForm({ token, inviteeEmail, companyName, alreadyAccepted }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const action = mode === 'signup' ? signUpForTeamInvite : loginForTeamInvite
    const result = await action(token, formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    if (result?.redirectTo) {
      router.push(result.redirectTo)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1.5">
            Join {companyName}
          </h1>
          <p className="text-sm text-gray-500">
            {mode === 'signup'
              ? 'Create your account to accept this invitation.'
              : 'Sign in to accept this invitation.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
          {alreadyAccepted && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-700">
                This invitation shows as already accepted — if that wasn&apos;t you, sign in below
                to check your access.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email address</label>
              <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-600">
                {inviteeEmail}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                This invitation is for this address specifically.
              </p>
            </div>

            {mode === 'signup' && (
              <div>
                <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Full name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Jane Smith"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={mode === 'signup' ? 8 : undefined}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
              />
              {mode === 'signup' && (
                <p className="mt-1 text-xs text-gray-400">Minimum 8 characters.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? mode === 'signup' ? 'Creating account…' : 'Signing in…'
                : mode === 'signup' ? 'Create account & join' : 'Sign in & join'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-gray-500">
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null) }}
            className="font-medium text-violet-600 transition hover:text-violet-800"
          >
            {mode === 'signup' ? 'Sign in instead' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  )
}
