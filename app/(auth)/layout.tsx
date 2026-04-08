import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'OnboardIQ — UK Employee Onboarding',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Top bar */}
      <header className="px-6 py-5 flex items-center">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-teal-700 flex items-center justify-center">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 3.5C2 2.67 2.67 2 3.5 2h7C11.33 2 12 2.67 12 3.5v2C12 6.33 11.33 7 10.5 7h-7C2.67 7 2 6.33 2 5.5v-2ZM2 9.5C2 8.67 2.67 8 3.5 8H7c.83 0 1.5.67 1.5 1.5S7.83 11 7 11H3.5C2.67 11 2 10.33 2 9.5Z"
                fill="white"
              />
            </svg>
          </div>
          <span className="font-semibold text-slate-900 text-[15px] tracking-tight">
            OnboardIQ
          </span>
        </Link>
      </header>

      {/* Centred content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center">
        <p className="text-xs text-slate-400">
          UK GDPR compliant · Data stored in the EU · ICO registered
        </p>
      </footer>
    </div>
  )
}
