'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginForWorkforceInvite, signUpForWorkforceInvite } from './actions'

interface Props {
  token: string
  inviteeEmail: string
  personName: string
  companyName: string
}

const cls = 'w-full rounded-lg border border-line-strong px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10'

export default function WorkforceInviteForm({ token, inviteeEmail, personName, companyName }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const action = mode === 'signup' ? signUpForWorkforceInvite : loginForWorkforceInvite
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
    <div className="min-h-screen bg-ink-inset flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-fg tracking-tight mb-1.5">Hi {personName.split(' ')[0]}</h1>
          <p className="text-sm text-fg-muted">
            {companyName} tracks your training and certificates on Vopria. {mode === 'signup' ? 'Create your account to see what is due and upload renewals.' : 'Sign in to continue.'}
          </p>
        </div>
        <div className="bg-ink-raised rounded-2xl border border-line shadow-sm p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-4 py-3">
                <p className="text-sm text-status-rejected">{error}</p>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg-body">Email address</label>
              {mode === 'signup' ? (
                <div className="w-full rounded-lg border border-line bg-ink-inset px-3.5 py-2.5 text-sm text-fg-body">{inviteeEmail}</div>
              ) : (
                <input name="email" type="email" defaultValue={inviteeEmail} required className={cls} />
              )}
            </div>
            {mode === 'signup' && (
              <div>
                <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-fg-body">Full name</label>
                <input id="full_name" name="full_name" type="text" required defaultValue={personName} autoComplete="name" className={cls} />
              </div>
            )}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-fg-body">Password</label>
              <input id="password" name="password" type="password" required minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className={cls} />
              {mode === 'signup' && <p className="mt-1 text-xs text-fg-muted">Minimum 8 characters.</p>}
            </div>
            <button type="submit" disabled={loading} className="mt-2 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60">
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="mt-5 text-center text-sm text-fg-muted">
          {mode === 'signup' ? 'Already have a Vopria account?' : 'Need an account?'}{' '}
          <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null) }} className="font-medium text-fg-accent transition hover:text-fg">
            {mode === 'signup' ? 'Sign in instead' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  )
}
