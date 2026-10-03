import { maturity } from '@/content/site'
import { Section, SectionHeading, cx } from '../ui'
import { Reveal } from '../Reveal'

/**
 * The AI maturity ladder — the signature graphic of the site.
 *
 * Desktop: four cards that physically step upward left to right, riding a
 * gradient track that deepens toward stage 4, so the idea of ascent is carried
 * by the layout itself rather than by decoration.
 * Mobile: the same four stages as a vertical climb down a rail.
 *
 * Marked up as an ordered list because the stages are genuinely sequential.
 */

/** Per-stage visual weight, deepening toward stage 4. */
const stageStyles = [
  {
    lift: 'lg:mt-16',
    badge: 'bg-accent-veil text-accent',
    card: 'border-line bg-canvas-raised',
    bar: 'from-accent-mist to-accent-soft',
  },
  {
    lift: 'lg:mt-11',
    badge: 'bg-accent-mist/70 text-accent',
    card: 'border-line bg-canvas-raised',
    bar: 'from-accent-soft to-accent',
  },
  {
    lift: 'lg:mt-6',
    badge: 'bg-accent/20 text-accent-hover',
    card: 'border-accent-mist bg-canvas-raised shadow-card',
    bar: 'from-accent to-primary-soft',
  },
  {
    lift: 'lg:mt-0',
    badge: 'bg-primary text-white',
    // The glow is the lifted shadow, moved onto a pseudo-element so it can
    // fade in last. See .glow-last in globals.css.
    card: 'border-primary/25 bg-canvas-raised glow-last',
    bar: 'from-primary-soft to-primary',
  },
] as const

export function Maturity() {
  return (
    <Section id={maturity.id} tone="canvas" labelledBy="maturity-heading">
      <Reveal>
        <SectionHeading
          id="maturity-heading"
          eyebrow={maturity.eyebrow}
          heading={maturity.heading}
          intro={maturity.intro}
        />
      </Reveal>

      <div className="relative mt-12">
        {/* The staircase itself carries the ascent — cards start progressively
            higher toward stage 4, and the colour deepens with them. Items must
            top-align for the offsets to read as steps. */}
        <ol className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-start lg:gap-6">
          {maturity.stages.map((stage, index) => {
            const style = stageStyles[index]

            return (
              <Reveal
                as="li"
                key={stage.number}
                step={index}
                className={style.lift}
              >
                <article
                  className={cx(
                    'group flex h-full flex-col gap-4 rounded-3xl border p-6 transition duration-300 hover:-translate-y-1',
                    style.card,
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cx(
                        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold',
                        style.badge,
                      )}
                    >
                      {stage.number}
                    </span>
                    <h3 className="text-lg font-extrabold tracking-tight text-ink">{stage.name}</h3>
                  </div>

                  <div
                    aria-hidden="true"
                    className={cx('bar-fill h-1 w-full rounded-full bg-gradient-to-r', style.bar)}
                  />

                  <p className="text-[0.95rem] font-semibold leading-relaxed text-ink">
                    {stage.summary}
                  </p>
                  <p className="text-sm leading-relaxed text-ink-muted">{stage.detail}</p>
                </article>
              </Reveal>
            )
          })}
        </ol>
      </div>

      <Reveal>
        <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl bg-accent-veil px-6 py-5 text-center">
          <p className="flex items-center gap-3 text-base font-semibold text-accent sm:text-lg">
            <RiseIcon />
            {maturity.caption}
          </p>
          {/* The ladder describes the destination; this is the service that
              actually gets a team there. */}
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-6">
            <a
              href={maturity.trainingLink.href}
              className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-accent underline underline-offset-4 transition hover:text-accent-hover"
            >
              {maturity.trainingLink.text}
              <ArrowIcon />
            </a>
            <a
              href={maturity.contactLink.href}
              className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-accent underline underline-offset-4 transition hover:text-accent-hover"
            >
              {maturity.contactLink.text}
              <ArrowIcon />
            </a>
          </div>
        </div>
      </Reveal>
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

function RiseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="hidden shrink-0 sm:block"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 16l5-5 4 3 6-7" />
      <path d="M14 7h4v4" />
    </svg>
  )
}
