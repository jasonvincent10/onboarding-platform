import { why } from '@/content/site'
import { Section, SectionHeading, cx } from '../ui'
import { Reveal } from '../Reveal'
import { allComplete } from '@/lib/placeholders'

export function Why() {
  // The founder note only appears once real words replace the [FOUNDER BIO]
  // placeholder in content/site.ts. Until then the points take the full
  // width, so the section reads as complete rather than half-empty.
  const showFounder = allComplete(why.founder.body, why.founder.name)

  // Five points do not divide evenly into a 4-across row, so without the
  // founder note they run 3-then-2 on large screens rather than leaving a
  // single orphan on a second row.
  const pointColumns = showFounder ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <Section id={why.id} tone="raised" labelledBy="why-heading">
      <Reveal>
        <SectionHeading id="why-heading" eyebrow={why.eyebrow} heading={why.heading} />
      </Reveal>

      <div
        className={cx(
          'mt-12 grid gap-10 lg:gap-14',
          showFounder && 'lg:grid-cols-[1.15fr_0.85fr]',
        )}
      >
        <ul className={cx('grid gap-5', pointColumns)}>
          {why.points.map((point, index) => (
            <Reveal as="li" key={point.title} delay={index * 80}>
              <div className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-canvas p-6 transition hover:border-accent-mist">
                <TickIcon />
                <h3 className="text-base font-extrabold tracking-tight text-ink">{point.title}</h3>
                <p className="text-[0.925rem] leading-relaxed text-ink-muted">{point.body}</p>
              </div>
            </Reveal>
          ))}
        </ul>

        {showFounder ? (
          <Reveal delay={160}>
            <FounderNote />
          </Reveal>
        ) : null}
      </div>
    </Section>
  )
}

/**
 * Founder note. The body text is a [FOUNDER BIO] placeholder in content/site.ts
 * — the layout is final, only the words need replacing.
 */
function FounderNote() {
  return (
    <figure className="flex h-full flex-col justify-between gap-6 rounded-3xl border border-accent-mist bg-brand-gradient-soft p-8">
      <div className="flex flex-col gap-4">
        <QuoteIcon />
        <h3 className="text-lg font-extrabold tracking-tight text-ink">{why.founder.heading}</h3>
        <blockquote className="text-[0.975rem] leading-relaxed text-ink-soft">
          {why.founder.body}
        </blockquote>
      </div>

      <figcaption className="flex items-center gap-3 border-t border-accent-mist/70 pt-5">
        {/* Monogram stands in until a founder photograph is supplied. */}
        <span
          aria-hidden="true"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-gradient text-sm font-extrabold text-white"
        >
          V
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-bold text-ink">{why.founder.name}</span>
          <span className="text-xs text-ink-muted">{why.founder.role}</span>
        </span>
      </figcaption>
    </figure>
  )
}

function TickIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" focusable="false">
      <rect width="28" height="28" rx="8" fill="#EDE9FE" />
      <path
        d="M9 14.4l3.2 3.2L19 10.8"
        stroke="#5B21B6"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function QuoteIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      className="text-accent"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 9c-3.6 1.4-5.6 4-5.6 7.4 0 2.7 1.6 4.6 3.9 4.6 2 0 3.5-1.5 3.5-3.4 0-1.9-1.3-3.3-3.1-3.3-.3 0-.6 0-.9.1.5-1.7 1.8-3 3.6-3.9L12 9zm10.6 0c-3.6 1.4-5.6 4-5.6 7.4 0 2.7 1.6 4.6 3.9 4.6 2 0 3.5-1.5 3.5-3.4 0-1.9-1.3-3.3-3.1-3.3-.3 0-.6 0-.9.1.5-1.7 1.8-3 3.6-3.9L22.6 9z"
        fill="currentColor"
      />
    </svg>
  )
}
