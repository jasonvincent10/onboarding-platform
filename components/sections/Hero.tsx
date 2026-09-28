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

        <Reveal delay={200} className="hidden lg:block">
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
      <div className="absolute -right-24 -top-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.22),transparent_68%)] blur-2xl" />
      <div className="absolute -left-40 top-36 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(91,33,182,0.14),transparent_70%)] blur-2xl" />
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
  const bars = [
    { height: 88, label: 'Assist' },
    { height: 136, label: 'Accelerate' },
    { height: 192, label: 'Automate' },
    { height: 256, label: 'Agentic' },
  ]

  return (
    <div
      aria-hidden="true"
      className="relative rounded-4xl border border-line bg-canvas-raised/80 p-8 shadow-lifted backdrop-blur-sm"
    >
      <div className="flex h-[19rem] items-end justify-between gap-4">
        {bars.map((bar, index) => (
          <div key={bar.label} className="flex flex-1 flex-col items-center gap-3">
            <div
              className="w-full rounded-t-xl rounded-b-md bg-brand-gradient"
              style={{
                height: `${bar.height}px`,
                opacity: 0.35 + index * 0.215,
              }}
            />
            <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted">
              {bar.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-line pt-5 text-xs font-medium text-ink-muted">
        <span>Where most teams are</span>
        <span className="text-primary">Where the value is</span>
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
        stroke="#5B21B6"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
