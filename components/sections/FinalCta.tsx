import { finalCta, site } from '@/content/site'
import { ButtonLink } from '../ui'
import { Reveal } from '../Reveal'

/** Full-width brand gradient band closing the page. */
export function FinalCta({ bookingUrl }: { bookingUrl: string }) {
  return (
    <section className="relative overflow-hidden bg-brand-gradient px-5 py-20 sm:px-6 md:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -left-20 -top-28 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.18),transparent_65%)]" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_68%)]" />
      </div>

      <Reveal className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-[2.75rem] md:leading-[1.12]">
          {finalCta.heading}
        </h2>

        <p className="max-w-2xl text-lg leading-relaxed text-white/85">{finalCta.body}</p>

        <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
          <ButtonLink href={bookingUrl} variant="inverse" size="lg">
            {finalCta.button.label}
          </ButtonLink>
          <a
            href={`mailto:${site.email}`}
            className="rounded text-sm font-semibold text-white/85 underline underline-offset-4 transition hover:text-white"
          >
            or email {site.email}
          </a>
        </div>
      </Reveal>
    </section>
  )
}
