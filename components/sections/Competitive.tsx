import { competitive } from '@/content/site'
import { Section, SectionHeading, type HeadingLevel } from '../ui'
import { Reveal } from '../Reveal'

/**
 * Short competitive-positioning band, sitting straight after the maturity
 * ladder so "where you stand" follows the stages that define it.
 *
 * Deliberately tinted rather than a second full gradient: the closing CTA is
 * the only gradient band on the page, and it should stay that way or it stops
 * reading as the end of the argument.
 */
export function Competitive({ headingLevel = 'h2' }: { headingLevel?: HeadingLevel } = {}) {
  // One level below the section heading, so a page whose section leads with an
  // h1 never jumps straight to h3.
  const ItemHeading = headingLevel === 'h1' ? 'h2' : 'h3'

  return (
    <Section id={competitive.id} tone="sunken" labelledBy="competitive-heading">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <Reveal>
          <SectionHeading
            id="competitive-heading"
            eyebrow={competitive.eyebrow}
            heading={competitive.heading}
          as={headingLevel}
          />
          <p className="mt-5 max-w-prose text-lg leading-relaxed text-ink-soft">
            {competitive.body}
          </p>
        </Reveal>

        <Reveal step={1} className="self-center">
          <ul className="flex flex-col gap-4">
            {competitive.markers.map((marker, index) => (
              <li
                key={marker.label}
                className="relative overflow-hidden rounded-2xl border border-line bg-canvas-raised p-6"
              >
                {/* A rising accent bar: the second marker sits higher up the
                    scale than the first, which is the whole point being made. */}
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 h-full w-1 bg-brand-gradient"
                  style={{ opacity: index === 0 ? 0.45 : 1 }}
                />
                <div className="pl-3">
                  <ItemHeading className="text-base font-extrabold tracking-tight text-ink">
                    {marker.label}
                  </ItemHeading>
                  <p className="mt-1.5 text-[0.925rem] leading-relaxed text-ink-muted">
                    {marker.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-accent-veil px-5 py-4">
            <p className="text-[0.975rem] font-semibold leading-relaxed text-accent">
              {competitive.closing}
            </p>
            <a
              href="/contact"
              className="inline-flex w-fit items-center gap-1.5 rounded text-sm font-bold text-accent underline underline-offset-4 transition hover:text-accent-hover"
            >
              {competitive.ctaLabel}
              <ArrowIcon />
            </a>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 8h10" />
      <path d="M9 4l4 4-4 4" />
    </svg>
  )
}
