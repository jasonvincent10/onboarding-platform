import { outcomes } from '@/content/site'
import { Section, SectionHeading, type HeadingLevel } from '../ui'
import { Reveal } from '../Reveal'

/**
 * Illustrative scenarios, not case studies.
 *
 * The disclaimer is deliberately placed directly under the heading — above the
 * cards rather than in small print beneath them — so nobody can read these as
 * claims about real client results.
 */
export function Outcomes({ headingLevel = 'h2' }: { headingLevel?: HeadingLevel } = {}) {
  // One level below the section heading, so a page whose section leads with an
  // h1 never jumps straight to h3.
  const ItemHeading = headingLevel === 'h1' ? 'h2' : 'h3'

  return (
    <Section id={outcomes.id} tone="sunken" labelledBy="outcomes-heading">
      <Reveal>
        <SectionHeading
          id="outcomes-heading"
          eyebrow={outcomes.eyebrow}
          heading={outcomes.heading}
          as={headingLevel}
        />
      </Reveal>

      <Reveal delay={60}>
        <p className="mt-5 flex max-w-prose items-start gap-2.5 rounded-xl border border-line-strong bg-canvas-raised px-4 py-3 text-sm text-ink-muted">
          <InfoIcon />
          <span>{outcomes.disclaimer}</span>
        </p>
      </Reveal>

      <ul className="mt-10 grid gap-5 md:grid-cols-3">
        {outcomes.items.map((item, index) => (
          <Reveal as="li" key={item.title} delay={index * 95}>
            <article className="flex h-full flex-col gap-4 rounded-3xl border border-line bg-canvas-raised p-7 transition duration-300 hover:-translate-y-1 hover:shadow-card">
              <span className="w-fit rounded-full bg-accent-veil px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-accent">
                {item.stage}
              </span>
              <ItemHeading className="text-lg font-extrabold tracking-tight text-ink">{item.title}</ItemHeading>
              <p className="flex-1 text-[0.95rem] leading-relaxed text-ink-muted">{item.body}</p>
              <p className="flex items-center gap-2 border-t border-line pt-4 text-sm font-semibold text-accent">
                <ArrowUpIcon />
                {item.metric}
              </p>
            </article>
          </Reveal>
        ))}
      </ul>

      <Reveal delay={120}>
        <p className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[0.975rem] text-ink-soft">
          {outcomes.ctaText}
          <a
            href="/contact"
            className="rounded font-bold text-accent underline underline-offset-4 transition hover:text-accent-hover"
          >
            {outcomes.ctaLabel}
          </a>
        </p>
      </Reveal>
    </Section>
  )
}

function InfoIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      className="mt-0.5 shrink-0 text-accent"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8.5" cy="8.5" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 7.5v4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8.5" cy="5" r="1" fill="currentColor" />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 11l4-4 3 2.5L13 4" />
      <path d="M9.5 4H13v3.5" />
    </svg>
  )
}
