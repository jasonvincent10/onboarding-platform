import Link from 'next/link'
import { furtherReading } from '@/content/site'
import { Section, SectionHeading } from '../ui'
import { Reveal } from '../Reveal'

/**
 * Signposts to the detail pages, sitting just above the closing CTA.
 *
 * The whole card is the link rather than a "read more" at the bottom of it:
 * a bigger target, and one stop in the tab order per card instead of two.
 */
export function FurtherReading() {
  return (
    <Section id={furtherReading.id} tone="sunken" labelledBy="further-reading-heading">
      <Reveal>
        <SectionHeading
          id="further-reading-heading"
          eyebrow={furtherReading.eyebrow}
          heading={furtherReading.heading}
          intro={furtherReading.intro}
        />
      </Reveal>

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {furtherReading.items.map((item, index) => (
          <Reveal as="li" key={item.href} delay={index * 80}>
            <Link
              href={item.href}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-canvas-raised p-6 transition duration-300 hover:-translate-y-1 hover:border-accent-mist hover:shadow-card"
            >
              <h3 className="flex items-center justify-between gap-3 text-base font-extrabold tracking-tight text-ink">
                {item.title}
                <ArrowIcon />
              </h3>
              <p className="text-[0.925rem] leading-relaxed text-ink-muted">{item.body}</p>
            </Link>
          </Reveal>
        ))}
      </ul>
    </Section>
  )
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-accent transition-transform duration-300 group-hover:translate-x-1"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 8h10" />
      <path d="M9 4l4 4-4 4" />
    </svg>
  )
}
