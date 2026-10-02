import { services } from '@/content/site'
import { ButtonLink, Section, SectionHeading } from '../ui'
import { Reveal } from '../Reveal'

/**
 * Three entry routes, then the two things that can follow.
 *
 * The split matters commercially: the top row is how an engagement starts,
 * and the "then, if you want us to" row is explicitly optional — which is the
 * point the copy makes, so the layout should not contradict it by presenting
 * five equal options. Build & Implement keeps the premium gradient treatment.
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

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.items.map((item, index) => (
          <Reveal key={item.slug} delay={index * 90}>
            <EntryCard item={item} index={index} />
          </Reveal>
        ))}
      </div>

      {/* The method used to run as a full section here. One line now, since
          the four steps live on /working-with-us. */}
      <Reveal delay={140}>
        <a
          href={services.methodLink.href}
          className="mt-6 inline-flex items-center gap-2 rounded text-[0.95rem] font-semibold text-accent underline underline-offset-4 transition hover:text-accent-hover"
        >
          {services.methodLink.text}
          <ArrowIcon />
        </a>
      </Reveal>

      {/* Follow-on work, visually separated so it reads as a later choice. */}
      <div className="mt-16">
        <Reveal>
          <div className="flex flex-col gap-2 border-t border-line pt-10">
            <h3 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
              {services.followOn.heading}
            </h3>
            <p className="max-w-prose text-[0.975rem] leading-relaxed text-ink-soft">
              {services.followOn.intro}
            </p>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {services.followOn.items.map((item, index) => (
            <Reveal key={item.slug} delay={index * 90}>
              {item.highlight ? (
                <HighlightCard item={item} bookingUrl={bookingUrl} />
              ) : (
                <FollowOnCard item={item} />
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

type EntryItem = (typeof services.items)[number]
type FollowOnItem = (typeof services.followOn.items)[number]

function EntryCard({ item, index }: { item: EntryItem; index: number }) {
  return (
    <article className="group flex h-full flex-col gap-4 rounded-3xl border border-line bg-canvas p-7 transition duration-300 hover:-translate-y-1 hover:border-accent-mist hover:shadow-card">
      <ServiceIcon index={index} />
      <div className="flex flex-col gap-1.5">
        <h3 className="text-xl font-extrabold tracking-tight text-ink">{item.title}</h3>
        <p className="text-[0.95rem] font-semibold leading-snug text-accent">{item.hook}</p>
      </div>
      <p className="text-[0.975rem] leading-relaxed text-ink-soft">{item.body}</p>
    </article>
  )
}

function FollowOnCard({ item }: { item: FollowOnItem }) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-3xl border border-line bg-canvas p-7 transition duration-300 hover:border-accent-mist hover:shadow-card">
      <LadderIcon />
      <h3 className="text-xl font-extrabold tracking-tight text-ink">{item.title}</h3>
      <p className="flex-1 text-[0.975rem] leading-relaxed text-ink-soft">{item.body}</p>
      {/* Ties this card back to the ladder it is the practical answer to. */}
      <a
        href="/#approach"
        className="inline-flex w-fit items-center gap-1.5 rounded text-sm font-semibold text-accent underline underline-offset-4 transition hover:text-accent-hover"
      >
        See the four stages
        <ArrowIcon />
      </a>
    </article>
  )
}

function HighlightCard({ item, bookingUrl }: { item: FollowOnItem; bookingUrl: string }) {
  return (
    <article className="relative flex h-full flex-col gap-5 overflow-hidden rounded-3xl bg-brand-gradient p-8 text-white shadow-lifted">
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
        <h3 className="text-2xl font-extrabold tracking-tight text-white">{item.title}</h3>
        <p className="max-w-xl text-[1.0625rem] leading-relaxed text-white/85">{item.body}</p>
      </div>

      <div className="relative">
        <ButtonLink href={bookingUrl} variant="inverse" size="lg">
          Talk to us about building
        </ButtonLink>
      </div>
    </article>
  )
}

/**
 * Simple custom glyphs, one per entry route — a magnifier on a single node
 * (targeted), a grid of connected nodes (whole business), and a shield
 * (foundations). Stroke-based so they sit quietly next to the copy.
 */
function ServiceIcon({ index }: { index: number }) {
  const glyphs = [
    // Targeted — one node, examined closely
    <g key="targeted" stroke="#C4B5FD" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18.5" cy="18.5" r="5.5" />
      <path d="M22.6 22.6L28 28" />
    </g>,
    // Whole business — a grid of connected nodes
    <g key="whole" stroke="#C4B5FD" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="14" cy="14" r="2.6" />
      <circle cx="26" cy="14" r="2.6" />
      <circle cx="14" cy="26" r="2.6" />
      <circle cx="26" cy="26" r="2.6" />
      <path d="M16.6 14h6.8M16.6 26h6.8M14 16.6v6.8M26 16.6v6.8" />
    </g>,
    // Foundations — a shield
    <g key="foundations" stroke="#C4B5FD" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10.5l7 2.8v5.2c0 4.4-2.9 8.2-7 9.5-4.1-1.3-7-5.1-7-9.5v-5.2l7-2.8z" />
      <path d="M17 19.5l2.2 2.2 4-4.2" />
    </g>,
  ]

  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="11" fill="#2C1D58" />
      {glyphs[index] ?? glyphs[0]}
    </svg>
  )
}

function LadderIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="11" fill="#2C1D58" />
      <g stroke="#C4B5FD" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 27v-3.5M17.3 27v-7M22.7 27v-10.5M28 27V13" />
      </g>
    </svg>
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

function SparkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M6 0l1.3 3.6L11 5l-3.7 1.4L6 10 4.7 6.4 1 5l3.7-1.4L6 0z" />
    </svg>
  )
}
