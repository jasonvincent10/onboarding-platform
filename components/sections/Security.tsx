import { security } from '@/content/site'
import { ButtonLink, Section, SectionHeading, type HeadingLevel } from '../ui'
import { Reveal } from '../Reveal'

/**
 * Safe adoption — shadow AI, policy, approved tools, UK GDPR, human oversight.
 *
 * The heading is a question most owners have not asked themselves, so the
 * section leads with it and answers plainly. Deliberately not alarmist: the
 * copy treats shadow AI as a policy gap rather than a staff failing, which is
 * both fairer and more accurate.
 */
export function Security({
  bookingUrl,
  headingLevel = 'h2',
}: {
  bookingUrl: string
  headingLevel?: HeadingLevel
}) {

  // One level below the section heading, so a page whose section leads with an
  // h1 never jumps straight to h3.
  const ItemHeading = headingLevel === 'h1' ? 'h2' : 'h3'
  return (
    <Section id={security.id} tone="sunken" labelledBy="security-heading">
      <Reveal>
        <SectionHeading
          id="security-heading"
          eyebrow={security.eyebrow}
          heading={security.heading}
          intro={security.intro}
        as={headingLevel}
        />
      </Reveal>

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {security.points.map((point, index) => (
          <Reveal as="li" key={point.title} step={index % 3}>
            <article className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-canvas-raised p-6 transition hover:border-accent-mist">
              <SecurityIcon index={index} />
              <ItemHeading className="text-base font-extrabold tracking-tight text-ink">{point.title}</ItemHeading>
              <p className="text-[0.925rem] leading-relaxed text-ink-muted">{point.body}</p>
            </article>
          </Reveal>
        ))}
      </ul>

      <Reveal>
        <div className="mt-10 flex flex-col items-start gap-5 rounded-3xl border border-accent-mist bg-brand-gradient-soft p-7 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="flex flex-col gap-2">
            <ItemHeading className="text-lg font-extrabold tracking-tight text-ink sm:text-xl">
              {security.cta.heading}
            </ItemHeading>
            <p className="max-w-xl text-[0.975rem] leading-relaxed text-ink-soft">
              {security.cta.body}
            </p>
          </div>
          <ButtonLink href={bookingUrl} size="lg" className="shrink-0">
            {security.cta.label}
          </ButtonLink>
        </div>
      </Reveal>
    </Section>
  )
}

/**
 * One glyph per point: an unseen account, a document, a verified tool, a
 * data record, and a person reviewing. Abstract and stroke-based to match the
 * rest of the site's iconography.
 */
function SecurityIcon({ index }: { index: number }) {
  const glyphs = [
    // Shadow AI — a figure partly out of view
    <g key="shadow" stroke="#C4B5FD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="12.5" r="3" />
      <path d="M10 22.5c0-3 2.7-5.2 6-5.2s6 2.2 6 5.2" />
      <path d="M20.5 10.5h6M20.5 14h4" strokeDasharray="2.5 2.5" strokeOpacity="0.6" />
    </g>,
    // Policy — a short document
    <g key="policy" stroke="#C4B5FD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9.5" y="7.5" width="13" height="17" rx="2.5" />
      <path d="M13 12.5h6M13 16h6M13 19.5h3.5" />
    </g>,
    // Approved tools — a tick in a rounded square
    <g key="approved" stroke="#C4B5FD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="8" width="16" height="16" rx="4.5" />
      <path d="M12.5 16l2.8 2.8 5-5.6" />
    </g>,
    // UK GDPR — a record behind a shield
    <g key="gdpr" stroke="#C4B5FD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 6.5l6.5 2.6v4.8c0 4-2.7 7.5-6.5 8.6-3.8-1.1-6.5-4.6-6.5-8.6V9.1L16 6.5z" />
      <path d="M13.5 15l1.9 1.9 3.6-3.8" />
    </g>,
    // Human oversight — an eye over a flow
    <g key="oversight" stroke="#C4B5FD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 14.5S9.7 9 16 9s9.5 5.5 9.5 5.5-3.2 5.5-9.5 5.5-9.5-5.5-9.5-5.5z" />
      <circle cx="16" cy="14.5" r="2.4" />
      <path d="M11 24h10" strokeOpacity="0.5" />
    </g>,
  ]

  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="#2C1D58" />
      {glyphs[index] ?? glyphs[0]}
    </svg>
  )
}
