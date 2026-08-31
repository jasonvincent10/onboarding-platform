import Link from 'next/link'
import ContactForm from './ContactForm'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Get in touch - Vopria',
  description:
    "Interested in Vopria's Unlimited plan? Tell us about your team and hiring volume and we'll get back to you with pricing.",
  path: '/contact',
})

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="text-xl font-semibold tracking-tight text-brand">
          Vopria
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold tracking-tight text-fg mb-1.5">
            Tell us what you need
          </h1>
          <p className="text-[15px] text-fg-muted mb-8">
            Interested in the Unlimited plan? Share a few details and we&apos;ll get back to you
            with pricing tailored to your team.
          </p>
          <div className="rounded-2xl border border-line bg-ink-raised p-7 shadow-sm">
            <ContactForm />
          </div>
        </div>
      </main>
    </div>
  )
}
