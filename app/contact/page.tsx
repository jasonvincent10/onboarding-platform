import type { Metadata } from 'next'
import { ContactForm } from '@/components/ContactForm'
import { ButtonLink, Eyebrow } from '@/components/ui'
import { contactPage, cta, site } from '@/content/site'
import { CALENDLY_URL, bookingHref } from '@/lib/config'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Tell us about your organisation and where your team is with AI today. Book a discovery call or send us a message. We reply within two working days.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: `Contact | ${site.name}`,
    description:
      'Book a discovery call or send us a message. We reply within two working days.',
    url: '/contact',
    type: 'website',
  },
}

export default function ContactPage() {
  const bookingUrl = bookingHref()
  // When CALENDLY_URL is unset, bookingHref() points back at this page — so
  // the "book a call" panel would link to itself. Show email only in that case.
  const hasBookingLink = CALENDLY_URL !== ''

  return (
    <div className="bg-canvas px-5 py-16 sm:px-6 md:py-24">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-3">
          <Eyebrow>{contactPage.eyebrow}</Eyebrow>
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            {contactPage.heading}
          </h1>
          <p className="max-w-prose text-lg leading-relaxed text-ink-soft">{contactPage.intro}</p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:gap-12">
          {/* The card heading lives inside ContactForm so it is replaced along
              with the form when the submission succeeds. */}
          <div className="rounded-3xl border border-line bg-canvas-raised p-6 shadow-card sm:p-8">
            <ContactForm />
          </div>

          <aside className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 rounded-3xl border border-accent-mist bg-brand-gradient-soft p-6">
              <h2 className="text-lg font-extrabold tracking-tight text-ink">
                {contactPage.directHeading}
              </h2>
              <p className="text-[0.925rem] leading-relaxed text-ink-soft">
                {contactPage.directBody}
              </p>

              {hasBookingLink ? (
                <ButtonLink href={bookingUrl} size="md" className="w-full">
                  {cta.short}
                </ButtonLink>
              ) : null}

              <div className="flex flex-col gap-1 border-t border-accent-mist/70 pt-4">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
                  Email us
                </span>
                <a
                  href={`mailto:${site.email}`}
                  className="rounded text-[0.95rem] font-semibold text-accent underline underline-offset-4 transition hover:text-accent-hover"
                >
                  {site.email}
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-line bg-canvas-raised p-6">
              <h2 className="text-sm font-extrabold tracking-tight text-ink">
                What happens next
              </h2>
              <ol className="mt-4 flex flex-col gap-3">
                {[
                  'We read your message and reply within two working days.',
                  'A 30-minute call to understand how your team works today.',
                  'If it looks like a fit, we scope a discovery engagement.',
                ].map((step, index) => (
                  <li key={step} className="flex gap-3 text-[0.9rem] leading-relaxed text-ink-muted">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent-veil text-xs font-bold text-accent">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
