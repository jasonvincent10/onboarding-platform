import { journey } from '@/content/site'
import { ButtonLink, Section, SectionHeading } from '../ui'
import { Reveal } from '../Reveal'

/**
 * What an engagement actually feels like, start to finish.
 *
 * Six steps is too many for one horizontal row at a readable size, so it runs
 * as three columns of two on desktop and a single vertical rail on mobile.
 * Numbered <ol>, because the order is the substance of the section.
 */
export function Journey({ bookingUrl }: { bookingUrl: string }) {
  return (
    <Section id={journey.id} tone="canvas" labelledBy="journey-heading">
      <Reveal>
        <SectionHeading
          id="journey-heading"
          eyebrow={journey.eyebrow}
          heading={journey.heading}
          intro={journey.intro}
        />
      </Reveal>

      <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {journey.steps.map((step, index) => (
          <Reveal as="li" key={step.name} delay={index * 70} className="relative">
            <div className="flex h-full gap-4">
              <div className="flex flex-col items-center">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-base font-extrabold text-white shadow-card">
                  {index + 1}
                </span>
                {/*
                  Rail joining consecutive steps — single column only. Once the
                  grid wraps at sm the sequence runs left to right, so a
                  downward rail would point at the wrong next step. The numbers
                  carry the order from there.
                */}
                {index < journey.steps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="mt-2 w-0.5 flex-1 rounded-full bg-line sm:hidden"
                  />
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5 pb-2">
                <h3 className="text-base font-extrabold tracking-tight text-ink">{step.name}</h3>
                <p className="text-[0.925rem] leading-relaxed text-ink-muted">{step.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </ol>

      <Reveal delay={120}>
        <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl bg-accent-veil px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.975rem] font-semibold leading-relaxed text-primary">
            {journey.cta.text}
          </p>
          <ButtonLink href={bookingUrl} size="md" className="shrink-0">
            {journey.cta.label}
          </ButtonLink>
        </div>
      </Reveal>
    </Section>
  )
}
