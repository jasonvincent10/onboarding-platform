'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/actions/auth'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: 'Onboardings',
    href: '/onboardings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5v-7Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 7.5h6M5 10h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Templates',
    href: '/templates',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 2.5h10a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5ZM3 7.5h4.5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V8a.5.5 0 0 1 .5-.5ZM10 7.5h3a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V8a.5.5 0 0 1 .5-.5Z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6.5 2.5h3l.5 1.5 1.5.5 1.5-1 2 2-1 1.5.5 1.5 1.5.5v3l-1.5.5-.5 1.5 1 1.5-2 2-1.5-1-1.5.5-.5 1.5h-3l-.5-1.5-1.5-.5-1.5 1-2-2 1-1.5L3 10l-1.5-.5v-3L3 6l.5-1.5-1-1.5 2-2 1.5 1 1.5-.5.5-1.5Z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
]

interface SidebarNavProps {
  companyName: string
  memberName: string
  onboardingsUsed: number
  subscriptionStatus: string
}

export default function SidebarNav({
  companyName,
  memberName,
  onboardingsUsed,
  subscriptionStatus,
}: SidebarNavProps) {
  const pathname = usePathname()

  const trialRemaining = Math.max(0, 3 - onboardingsUsed)
  const isOnTrial = subscriptionStatus === 'trial'

  return (
    <aside className="w-60 shrink-0 min-h-screen bg-white border-r border-slate-200 flex flex-col">
      {/* Logo + company */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-700 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 3.5C2 2.67 2.67 2 3.5 2h7C11.33 2 12 2.67 12 3.5v2C12 6.33 11.33 7 10.5 7h-7C2.67 7 2 6.33 2 5.5v-2ZM2 9.5C2 8.67 2.67 8 3.5 8H7c.83 0 1.5.67 1.5 1.5S7.83 11 7 11H3.5C2.67 11 2 10.33 2 9.5Z"
                fill="white"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
              {companyName}
            </p>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">OnboardIQ</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-50 text-teal-800'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={isActive ? 'text-teal-700' : 'text-slate-400'}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Trial banner */}
      {isOnTrial && (
        <div className="mx-3 mb-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3.5">
          <p className="text-xs font-semibold text-amber-800 mb-0.5">Free trial</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            {trialRemaining > 0
              ? `${trialRemaining} free onboarding${trialRemaining !== 1 ? 's' : ''} remaining`
              : 'Trial complete — add billing to continue'}
          </p>
          {trialRemaining === 0 && (
            <Link
              href="/settings/billing"
              className="mt-2 block text-xs font-semibold text-amber-800 underline hover:text-amber-900 transition"
            >
              Add payment method →
            </Link>
          )}
        </div>
      )}

      {/* User + logout */}
      <div className="px-3 py-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-teal-800">
              {memberName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-700 truncate">{memberName}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Sign out"
              className="text-slate-400 hover:text-slate-700 transition p-1"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M9.5 4.5 12 7l-2.5 2.5M12 7H5.5M5.5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
