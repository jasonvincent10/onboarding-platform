'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface EmployeeAuthFormProps {
  token?: string
  error?: string
}

export default function EmployeeAuthForm({ token, error }: EmployeeAuthFormProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState(error ?? '')
  const router = useRouter()
  const supabase = createClient()

  const redirectTarget = token ? `/join?token=${token}` : '/employee/dashboard'

  async function handleSubmit() {
    setLoading(true)
    setFormError('')

    if (mode === 'signup') {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role: 'employee' } },
      })
      if (authError) { setFormError(authError.message); setLoading(false); return }
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setFormError(authError.message); setLoading(false); return }
    }

    router.push(redirectTarget)
  }

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-brand rounded-xl mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-fg">
          {token ? 'Accept your invitation' : 'Employee login'}
        </h1>
        <p className="text-fg-muted mt-1 text-sm">
          {mode === 'signup'
            ? 'Create your account to get started'
            : 'Welcome back — sign in to continue'}
        </p>
      </div>

      {/* Card */}
      <div className="bg-ink-raised rounded-2xl shadow-sm border border-line p-6 space-y-4">
        {/* Mode toggle */}
        <div className="flex rounded-lg bg-ink-inset p-1">
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
              mode === 'signup' ? 'bg-ink-raised shadow-sm text-fg' : 'text-fg-muted'
            }`}
          >
            New account
          </button>
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
              mode === 'login' ? 'bg-ink-raised shadow-sm text-fg' : 'text-fg-muted'
            }`}
          >
            Sign in
          </button>
        </div>

        {mode === 'signup' && (
          <div>
            <label className="block text-sm font-medium text-fg-body mb-1">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full px-3 py-2 border border-line-strong rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-fg-body mb-1">Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="w-full px-3 py-2 border border-line-strong rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-body mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 border border-line-strong rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>

        {formError && (
          <p className="text-status-rejected text-sm bg-status-rejected/10 border border-status-rejected/30 rounded-lg px-3 py-2">
            {formError === 'invalid_invite' ? 'This invitation link is invalid or has expired.' : formError}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          className="w-full py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Please wait…' : mode === 'signup' ? 'Create account & continue' : 'Sign in & continue'}
        </button>
      </div>

      <p className="text-center text-xs text-fg-muted mt-6">
        Your data is encrypted and handled in accordance with UK GDPR.
      </p>
    </div>
  )
}
