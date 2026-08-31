import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink">
      <header className="px-6 py-5">
        <Link href="/" className="text-xl font-semibold tracking-tight text-brand">
          Vopria
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>
    </div>
  )
}
