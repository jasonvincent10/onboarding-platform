import { services } from '@/content/site'
import { ButtonLink, Section, SectionHeading } from '../ui'
import { Reveal } from '../Reveal'

const standardServices = services.items.filter((item) => !item.highlight)
const highlightService = services.items.find((item) => item.highlight)

/**
 * The four service cards. "Build & Implement" is the premium offer, so it gets
 * the inverted gradient treatment and spans wider on large screens — the
 * visual hierarchy does the selling rather than a louder headline.
 */
export function Services({ bookingUrl }: { bookingUrl: string }) {
  return (
    <Section id={services.id} tone="raised" labelledBy="services-heading">
      <Reveal>
        <SectionHeading
          id="services-heading"
          eyebrow={services.eyebrow}
          heading={services.heading}
          intro={services.intro}
        />
      </Reveal>

      {/* The three advisory services sit on one row; the premium build offer
          spans the full width beneath them, so it reads as the step beyond
          rather than a fourth equal option. */}
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {standardServices.map((item, index) => (
          <Reveal key={item.slug} delay={index * 90}>
            <StandardCard item={item} index={index} />
          </Reveal>
        ))}
      </div>

      {highlightService ? (
        <Reveal delay={120} className="mt-5">
          <HighlightCard item={highlightService} bookingUrl={bookingUrl} />
        </Reveal>
      ) : null}
    </Section>
  )
}

type ServiceItem = (typeof services.items)[number]

function StandardCard({ item, index }: { item: ServiceItem; index: number }) {
  return (
    <article className="group flex h-full flex-col gap-4 rounded-3xl border border-line bg-canvas p-7 transition duration-300 hover:-translate-y-1 hover:border-accent-mist hover:shadow-card">
      <ServiceIcon index={index} />
      <h3 className="text-xl font-extrabold tracking-tight text-ink">{item.title}</h3>
      <p className="text-[0.975rem] leading-relaxed text-ink-soft">{item.body}</p>
    </article>
  )
}

function HighlightCard({ item, bookingUrl }: { item: ServiceItem; bookingUrl: string }) {
  return (
    <article className="relative flex h-full flex-col gap-5 overflow-hidden rounded-3xl bg-brand-gradient p-8 text-white shadow-lifted md:flex-row md:items-center md:gap-10 md:p-10">
      {/* Soft bloom so the gradient does not read as a flat block. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.22),transparent_65%)]"
      />

      <div className="relative flex flex-1 flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white ring-1 ring-inset ring-white/25">
          <SparkIcon />
          {'badge' in item ? item.badge : 'Full delivery'}
        </span>
        <h3 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
          {item.title}
        </h3>
        <p className="max-w-xl text-[1.0625rem] leading-relaxed text-accent-veil">{item.body}</p>
      </div>

      <div className="relative shrink-0">
        <ButtonLink href={bookingUrl} variant="inverse" size="lg">
          Talk to us about building
        </ButtonLink>
      </div>
    </article>
  )
}

/**
 * Simple custom glyphs, one per service — a map (discovery), a ranked report,
 * a rising person (training). Kept abstract and stroke-based to sit quietly
 * next to the copy.
 */
function ServiceIcon({ index }: { index: number }) {
  const common = {
    width: 40,
    height: 40,
    viewBox: '0 0 40 40',
    fill: 'none',
    'aria-hidden': true as const,
    focusable: 'false' as const,
  }

  const glyphs = [
    // Process map — connected nodes
    <g key="map" stroke="#5B21B6" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="14" cy="14" r="3.2" />
      <circle cx="26" cy="21" r="3.2" />
      <circle cx="15" cy="27" r="3.2" />
      <path d="M16.7 15.7l6.6 3.8M23.6 23.2l-5.9 3" />
    </g>,
    // Prioritised report — bars of descending length
    <g key="report" stroke="#5B21B6" strokeWidth="1.9" strokeLinecap="round">
      <rect x="11" y="11" width="18" height="18" rx="3.5" strokeLinejoin="round" />
      <path d="M15.5 17h9M15.5 20.5h6.5M15.5 24h4" />
    </g>,
    // Capability — a figure stepping up
    <g key="training" stroke="#5B21B6" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="20" cy="14.5" r="3" />
      <path d="M12.5 28c0-3.6 3.4-6.5 7.5-6.5s7.5 2.9 7.5 6.5" />
    </g>,
  ]

  return (
    <svg {...common}>
      <rect width="40" height="40" rx="11" fill="#EDE9FE" />
      {glyphs[index] ?? glyphs[0]}
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M6 0l1.3 3.6L11 5l-3.7 1.4L6 10 4.7 6.4 1 5l3.7-1.4L6 0z" />
    </svg>
  )
}
