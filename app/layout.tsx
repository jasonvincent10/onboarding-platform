import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'OnboardIQ — UK Employee Onboarding',
  description:
    'Compliant, paperless employee onboarding for UK SMEs. P45, right to work, bank details — all in one place.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans antialiased text-slate-900 bg-stone-50">{children}</body>
    </html>
  )
}
