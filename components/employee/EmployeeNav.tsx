'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface EmployeeNavProps {
  name: string
  email: string
}

export default function EmployeeNav({ name, email }: EmployeeNavProps) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/employee-login')
  }

  // Initials for avatar
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo / brand */}
        <Link href="/employee/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-800 hidden sm:block">Onboarder</span>
        </Link>

        {/* User + sign out */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-medium text-slate-800 leading-tight">{name}</p>
            <p className="text-xs text-slate-400 leading-tight">{email}</p>
          </div>
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-indigo-700">{initials}</span>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors ml-1"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
