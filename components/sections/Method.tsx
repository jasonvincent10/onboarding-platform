import { method } from '@/content/site'
import { Section, SectionHeading, type HeadingLevel } from '../ui'
import { Reveal } from '../Reveal'

/**
 * The Vopria Discovery Method — Map → Measure → Model → Mobilise.
 *
 * Horizontal timeline on desktop, vertical rail on mobile. The connecting line
 * is decorative; the <ol> carries the actual sequence for assistive tech.
 *
 * Keeps the `how-we-work` anchor id (from content/site.ts) so links published
 * before the method was branded still land in the right place.
 */
export function Method({ headingLevel = 'h2' }: { headingLevel?: HeadingLevel } = {}) {
  // One level below the section heading, so a page whose section leads with an
  // h1 never jumps straight to h3.
  const ItemHeading = headingLevel === 'h1' ? 'h2' : 'h3'

  return (
    <Section id={method.id} tone="canvas" labelledBy="method-heading">
      <Reveal>
        <SectionHeading
          id="method-heading"
          eyebrow={method.eyebrow}
          heading={method.heading}
          intro={method.intro}
        as={headingLevel}
          />
      </Reveal>

      <ol className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
        {/* Desktop connector, level with the centre of the step markers. Both
            ends fade out so the track does not collide with the section edges,
            and the colour brightens left to right like the maturity ladder. */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-6 hidden h-0.5 -translate-y-1/2 bg-[linear-gradient(to_right,transparent_0%,#4A3578_7%,#8B5CF6_50%,#C4B5FD_88%,transparent_100%)] md:block"
        />

        {method.steps.map((step, index) => (
          <Reveal as="li" key={step.number} delay={index * 100} className="relative">
            {/* Mobile rail, drawn between markers rather than past the last one. */}
            {index < method.steps.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute left-6 top-14 h-[calc(100%+1rem)] w-0.5 bg-line-strong md:hidden"
              />
            ) : null}

            <div className="flex gap-5 md:flex-col md:gap-4">
              <span className="relative z-10 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-lg font-extrabold text-white shadow-card ring-4 ring-canvas">
                {step.number}
              </span>

              <div className="flex flex-col gap-2 pt-1 md:pt-0">
                <ItemHeading className="text-lg font-extrabold tracking-tight text-ink">{step.name}</ItemHeading>
                <p className="max-w-sm text-[0.95rem] leading-relaxed text-ink-muted">{step.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </ol>
    </Section>
  )
}
