import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FREE_FEATURES, FREE_ONBOARDING_LIMIT, MONTHLY_PRICE_PENCE } from '@/lib/plans'
import PlanChooser from '@/components/pricing/PlanChooser'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Vopria — Employee Onboarding',
  description:
    'Onboard new starters and keep your whole workforce compliant. Right to work, DBS, tickets, licences and mandatory training, tracked and chased before they expire.',
  path: '/',
})

const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Vopria',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    name: 'Onboarding',
    price: '49',
    priceCurrency: 'GBP',
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/#pricing`,
  },
}

// Four of five approved is 80%, which is how the real dashboard computes
// readiness. The previous version showed three of five and claimed 80%.
const heroOnboarding = [
  { label: 'Eligibility to work', status: 'approved' },
  { label: 'Previous employer documents', status: 'approved' },
  { label: 'Bank details', status: 'approved' },
  { label: 'Pension form', status: 'approved' },
  { label: 'Emergency contacts', status: 'submitted' },
]

const heroCompliance = [
  { name: 'Sarah Ahmed', requirement: 'First aid at work', status: 'expired', note: 'Expired' },
  { name: 'Tom Reilly', requirement: 'DBS check', status: 'expiring', note: '12 days' },
  { name: 'Priya Shah', requirement: 'Moving and handling', status: 'expiring', note: '26 days' },
  { name: 'Dan Okafor', requirement: 'CSCS card', status: 'valid', note: 'Aug 2029' },
]

const DOT_COLOURS: Record<string, string> = {
  approved: 'bg-status-approved',
  valid: 'bg-status-approved',
  submitted: 'bg-status-pending',
  expiring: 'bg-status-pending',
  expired: 'bg-status-rejected',
}

function StatusDot({ status }: { status: string }) {
  return <span className={'inline-block h-2.5 w-2.5 shrink-0 rounded-full ' + (DOT_COLOURS[status] ?? 'bg-status-inactive')} />
}

function noteColour(status: string): string {
  if (status === 'expired') return 'text-status-rejected'
  if (status === 'expiring') return 'text-status-pending'
  return 'text-fg-muted'
}

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <main className="bg-ink text-fg-body">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />
      {/* Nav */}
      <header className="border-b border-line bg-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-2xl font-semibold tracking-tight text-brand">Vopria</span>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#how" className="hidden text-fg-body hover:text-fg sm:inline">How it works</a>
            <a href="#pricing" className="hidden text-fg-body hover:text-fg sm:inline">Pricing</a>
            <Link href="/login" className="text-fg-body hover:text-fg">Log in</Link>
            <Link href="/sign-up" className="rounded-md bg-brand px-4 py-2 font-medium text-on-accent hover:bg-brand-hover">
              Start free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-wash mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.09em] text-fg-accent">
            For UK companies with 20 to 200 people
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.15] tracking-tight text-fg sm:text-5xl">
            Every new starter ready on day one. Every compliance check done properly.
          </h1>
          <p className="mt-5 max-w-[52ch] text-lg leading-[1.6] text-fg-body">
            Getting this wrong is costly and slow to fix. Vopria gets every new starter ready
            for day one, then keeps the team you already have in date: DBS checks, tickets,
            licences and mandatory training, tracked and chased before they lapse.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/sign-up" className="rounded-md bg-brand px-6 py-3 text-base font-semibold text-on-accent hover:bg-brand-hover">
              Onboard your first 3 hires free
            </Link>
            <span className="text-sm text-fg-muted">No card required. Set up in minutes.</span>
          </div>
        </div>

        {/* Hero mockups: one card per product, so the page shows both jobs */}
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-ink-raised p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.09em] text-fg-accent">Onboarding</p>
                <p className="mt-1.5 text-sm font-semibold text-fg">John Smith</p>
                <p className="text-xs text-fg-muted">Operations Assistant, starts Monday 20 July</p>
              </div>
              <span className="shrink-0 rounded-full bg-status-approved/15 px-3 py-1 text-xs font-semibold text-status-approved">
                80% ready
              </span>
            </div>
            <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-ink-inset">
              {heroOnboarding.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-3 text-fg-body">
                    <StatusDot status={item.status} />
                    {item.label}
                  </span>
                  <span className="shrink-0 text-xs capitalize text-fg-muted">{item.status}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-ink-raised p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.09em] text-fg-accent">Compliance</p>
                <p className="mt-1.5 text-sm font-semibold text-fg">Your workforce</p>
                <p className="text-xs text-fg-muted">62 people tracked, every day of the year</p>
              </div>
              <span className="shrink-0 rounded-full bg-status-rejected/15 px-3 py-1 text-xs font-semibold text-status-rejected">
                3 need attention
              </span>
            </div>
            <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-ink-inset">
              {heroCompliance.map((row) => (
                <li key={row.name} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-3">
                    <StatusDot status={row.status} />
                    <span className="truncate text-fg-body">
                      {row.name}
                      <span className="text-fg-muted"> · {row.requirement}</span>
                    </span>
                  </span>
                  <span className={'shrink-0 text-xs font-medium ' + noteColour(row.status)}>{row.note}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs leading-[1.6] text-fg-muted">
            Two questions, answered at a glance. Will this person be ready on their start date, and is
            everyone already here still in date?
          </p>
        </div>
      </section>

      {/* Benefits / feature strip */}
      <section className="border-t border-line bg-ink-inset">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-3">
          <div>
            <h3 className="text-base font-semibold text-fg">Compliance you can evidence</h3>
            <p className="mt-2 text-sm leading-[1.6] text-fg-body">
              Structured eligibility and identity capture with guidance on acceptable documents, plus a
              full audit trail of every upload, approval and consent, timestamped and exportable.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-fg">No more chasing</h3>
            <p className="mt-2 text-sm leading-[1.6] text-fg-body">
              Automatic reminders nudge new starters before deadlines and escalate anything
              overdue to you, so nothing gets missed in an inbox.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-fg">Built for one person to run</h3>
            <p className="mt-2 text-sm leading-[1.6] text-fg-body">
              A ready-made onboarding template gets you started the moment you sign up. Invite
              a new starter in under a minute; approve documents in one click. Hiring somewhere
              with different requirements? We&apos;ll build a template around them.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-fg">How it works</h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
          <li className="rounded-lg border border-line bg-ink-raised p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.09em] text-fg-accent">Step 1</p>
            <h3 className="mt-2 font-semibold text-fg">Invite your new starter</h3>
            <p className="mt-2 text-sm leading-[1.6] text-fg-body">
              Enter their name, email and start date. They get a branded invitation from your company.
            </p>
          </li>
          <li className="rounded-lg border border-line bg-ink-raised p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.09em] text-fg-accent">Step 2</p>
            <h3 className="mt-2 font-semibold text-fg">They complete a guided checklist</h3>
            <p className="mt-2 text-sm leading-[1.6] text-fg-body">
              Uploads, forms and policy sign-offs on any device, with clear guidance on what is acceptable.
            </p>
          </li>
          <li className="rounded-lg border border-line bg-ink-raised p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.09em] text-fg-accent">Step 3</p>
            <h3 className="mt-2 font-semibold text-fg">You review and approve</h3>
            <p className="mt-2 text-sm leading-[1.6] text-fg-body">
              One-click approval or a re-upload request with a note. Export everything as CSV for payroll.
            </p>
          </li>
        </ol>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-line bg-ink-inset">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-fg">Pay for what you need</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-[1.6] text-fg-body">
            Vopria does two jobs. It gets new starters ready for day one, and it keeps the team you
            already have in date all year. Take either on its own, or both together for less.
          </p>

          <div className="mt-8">
            <PlanChooser mode="marketing" />
          </div>

          <div className="mt-6 rounded-xl border border-line bg-ink-raised p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.09em] text-fg-accent">Not ready to pay?</p>
                <p className="mt-1 text-lg font-semibold text-fg">Your first {FREE_ONBOARDING_LIMIT} onboardings are free</p>
                <ul className="mt-3 space-y-1.5">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-fg-body">
                      <span className="text-fg-accent">-</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/sign-up" className="rounded-md border border-line-strong px-6 py-3 text-base font-semibold text-fg hover:border-brand hover:text-fg-accent transition-colors">
                Start free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Employee section */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-xl border border-line bg-ink-raised p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.09em] text-fg-muted">
            Starting a new job?
          </p>
          <h2 className="mt-2 text-xl font-semibold text-fg">
            You control exactly what your employer can see
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-[1.6] text-fg-body">
            If your new employer uses Vopria, you will receive an invitation by email.
            You grant access category by category, so you decide exactly what your employer
            can see. And if it doesn&apos;t work out, your documents and personal data are
            automatically deleted within 7 days of that outcome — nothing lingers on our
            servers longer than it needs to.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-fg-muted">
          <span>Vopria. Onboarding, done right.</span>
          <nav className="flex gap-6">
            <Link href="/legal/terms" className="hover:text-fg">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-fg">Privacy</Link>
            <Link href="/legal/dpa" className="hover:text-fg">DPA</Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}
