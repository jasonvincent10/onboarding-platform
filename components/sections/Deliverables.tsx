import { deliverables } from '@/content/site'
import { ButtonLink, Section, SectionHeading } from '../ui'
import { Reveal } from '../Reveal'
import { OpportunityMatrix } from '../OpportunityMatrix'

/**
 * "What you get" — the five signature deliverables, with the Opportunity
 * Matrix shown rather than described, since it is the one deliverable whose
 * value is obvious at a glance.
 *
 * The matrix sits beside the list on large screens and above it on small,
 * where a wide chart is better met first at full width than squeezed
 * alongside text.
 */
export function Deliverables({ bookingUrl }: { bookingUrl: string }) {
  return (
    <Section id={deliverables.id} tone="raised" labelledBy="deliverables-heading">
      <Reveal>
        <SectionHeading
          id="deliverables-heading"
          eyebrow={deliverables.eyebrow}
          heading={deliverables.heading}
          intro={deliverables.intro}
        />
      </Reveal>

      <div className="mt-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
        <ol className="order-2 flex flex-col gap-3 lg:order-1">
          {deliverables.items.map((item, index) => (
            <Reveal as="li" key={item.title} delay={index * 70}>
              <article className="flex gap-4 rounded-2xl border border-line bg-canvas p-5 transition hover:border-accent-mist sm:p-6">
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-veil text-sm font-extrabold text-primary"
                >
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-extrabold tracking-tight text-ink">{item.title}</h3>
                  <p className="text-[0.925rem] leading-relaxed text-ink-muted">{item.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </ol>

        {/*
          min-w-0 is load-bearing: a grid item defaults to min-width:auto, so
          without it the chart's min-width escapes its own scroll container and
          widens the whole page on narrow screens.
        */}
        <Reveal
          delay={120}
          className="order-1 min-w-0 lg:order-2 lg:sticky lg:top-28 lg:self-start"
        >
          <OpportunityMatrix />
        </Reveal>
      </div>

      <Reveal delay={140}>
        <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl bg-accent-veil px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-[0.975rem] font-semibold leading-relaxed text-primary">
            Every one of these is yours to keep, whether or not you ask us to build anything.
          </p>
          <ButtonLink href={bookingUrl} size="md" className="shrink-0">
            Book a discovery call
          </ButtonLink>
        </div>
      </Reveal>
    </Section>
  )
}
