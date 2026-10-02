import { hero } from '@/content/site'
import { ButtonLink, Eyebrow } from '../ui'
import { Reveal } from '../Reveal'

/**
 * Opening section. The visual is a pure-CSS/SVG abstract: soft brand-purple
 * gradient blooms behind a stepped line that echoes the four-stage ladder
 * further down the page. No imagery, so nothing to download.
 */
export function Hero({ bookingUrl }: { bookingUrl: string }) {
  return (
    <section className="relative overflow-hidden bg-canvas px-5 pb-20 pt-14 sm:px-6 md:pb-28 md:pt-20">
      <Backdrop />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="flex flex-col items-start gap-6">
          <Reveal>
            <Eyebrow>{hero.eyebrow}</Eyebrow>
          </Reveal>

          <Reveal delay={60}>
            <h1 className="max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl md:text-[3.5rem]">
              {hero.heading}
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="max-w-prose text-lg leading-relaxed text-ink-soft">{hero.subheading}</p>
          </Reveal>

          <Reveal delay={180} className="w-full">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={bookingUrl} size="lg">
                {hero.primaryCta.label}
                <ArrowIcon />
              </ButtonLink>
              <ButtonLink href={hero.secondaryCta.href} variant="secondary" size="lg">
                {hero.secondaryCta.label}
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={240}>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
              {hero.assurances.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckIcon />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <LadderVisual />
        </Reveal>
      </div>
    </section>
  )
}

/** Soft brand blooms, positioned so they never sit behind body text. */
function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -right-24 -top-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.20),transparent_68%)] blur-2xl" />
      <div className="absolute -left-40 top-36 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.24),transparent_70%)] blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
    </div>
  )
}

/**
 * Decorative stepped-ascent graphic. Four rising bars with a connecting path —
 * a quiet preview of the maturity ladder, so the page's central idea is visible
 * before the visitor scrolls.
 */
function LadderVisual() {
  // Heights are percentages of the plot, not fixed pixels, so the one height
  // value below scales the whole graphic. Fixed pixels were why this used to
  // be desktop-only: a 256px bar does not belong under the hero copy on a
  // phone, and hiding it left mobile and tablet with no hero visual at all.
  const bars = [
    { height: 34, label: 'Assist' },
    { height: 53, label: 'Accelerate' },
    { height: 75, label: 'Automate' },
    { height: 100, label: 'Agentic' },
  ]

  return (
    <div
      aria-hidden="true"
      className="relative rounded-3xl border border-line bg-canvas-raised/80 p-5 shadow-lifted backdrop-blur-sm sm:rounded-4xl sm:p-6 lg:p-8"
    >
      {/* Bars and labels are separate rows rather than four stacked columns.
          A percentage height only resolves against a parent with a definite
          height, so the bars must sit directly inside the fixed-height row. */}
      <div className="grid h-36 grid-cols-4 items-end gap-2 sm:h-48 sm:gap-4 lg:h-64">
        {bars.map((bar, index) => (
          <div
            key={bar.label}
            className="w-full rounded-t-lg rounded-b-sm bg-brand-gradient sm:rounded-t-xl sm:rounded-b-md"
            style={{
              height: `${bar.height}%`,
              opacity: 0.35 + index * 0.215,
            }}
          />
        ))}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 sm:mt-3 sm:gap-4">
        {bars.map((bar) => (
          <span
            key={bar.label}
            className="truncate text-center text-[0.55rem] font-semibold uppercase tracking-tight text-ink-muted sm:text-[0.7rem] sm:tracking-wide"
          >
            {bar.label}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4 text-[0.65rem] font-medium text-ink-muted sm:mt-6 sm:pt-5 sm:text-xs">
        <span>Where most teams are</span>
        <span className="text-accent">Where the value is</span>
      </div>
    </div>
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
      strokeWidth="1.9"
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

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0 text-accent"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="8" r="8" fill="currentColor" fillOpacity="0.16" />
      <path
        d="M4.75 8.25l2.25 2.25 4.25-4.5"
        stroke="#C4B5FD"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
