'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'General', href: '/settings' },
  { label: 'Team', href: '/settings/team' },
  { label: 'Billing', href: '/settings/billing' },
]

export default function SettingsTabs() {
  const pathname = usePathname()

  return (
    <div className="border-b border-line">
      <nav className="flex gap-6">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-brand text-fg-accent'
                  : 'border-transparent text-fg-muted hover:text-fg'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
