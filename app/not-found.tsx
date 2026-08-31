import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page not found - Vopria',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="text-xl font-semibold tracking-tight text-brand">
          Vopria
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.09em] text-fg-accent">404</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-fg">Page not found</h1>
          <p className="mt-3 max-w-md text-fg-body">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="rounded-md bg-brand px-6 py-3 text-base font-semibold text-on-accent hover:bg-brand-hover"
            >
              Back to homepage
            </Link>
            <Link href="/contact" className="text-sm font-medium text-fg-accent hover:text-fg">
              Contact us
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
