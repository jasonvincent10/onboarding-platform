import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const heroItems = [
  { label: 'Right to work check', status: 'approved' },
  { label: 'P45 uploaded', status: 'approved' },
  { label: 'Bank details', status: 'approved' },
  { label: 'Emergency contacts', status: 'submitted' },
  { label: 'Pension form', status: 'pending' },
]

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'approved'
      ? 'bg-status-approved'
      : status === 'submitted'
        ? 'bg-status-pending'
        : 'bg-status-inactive'
  return <span className={'inline-block h-2.5 w-2.5 rounded-full ' + color} />
}

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <main className="bg-ink text-fg-body">
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
            For UK SMEs hiring 5 to 200 people a year
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.15] tracking-tight text-fg sm:text-5xl">
            Every new starter ready on day one. Every right to work check done properly.
          </h1>
          <p className="mt-5 max-w-[52ch] text-lg leading-[1.6] text-fg-body">
            Getting a right to work check wrong can cost up to 60,000 pounds per worker.
            Vopria replaces the email chase with one guided checklist: documents, bank
            details, NI number and policy sign-offs, collected, reviewed and logged.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/sign-up" className="rounded-md bg-brand px-6 py-3 text-base font-semibold text-on-accent hover:bg-brand-hover">
              Onboard your first 3 hires free
            </Link>
            <span className="text-sm text-fg-muted">No card required. Set up in minutes.</span>
          </div>
        </div>

        {/* Hero checklist card */}
        <div className="rounded-xl border border-line bg-ink-raised p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-fg">Amara Okafor</p>
              <p className="text-xs text-fg-muted">Operations Assistant, starts Monday 20 July</p>
            </div>
            <span className="rounded-full bg-status-approved/15 px-3 py-1 text-xs font-semibold text-status-approved">
              80% ready
            </span>
          </div>
          <ul className="mt-5 divide-y divide-line rounded-lg border border-line bg-ink-inset">
            {heroItems.map((item) => (
              <li key={item.label} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="flex items-center gap-3 text-fg-body">
                  <StatusDot status={item.status} />
                  {item.label}
                </span>
                <span className="text-xs capitalize text-fg-muted">{item.status}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-fg-muted">
            The dashboard answers one question at a glance: will this person be ready on their start date?
          </p>
        </div>
      </section>

      {/* Benefits / feature strip */}
      <section className="border-t border-line bg-ink-inset">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-3">
          <div>
            <h3 className="text-base font-semibold text-fg">Compliance you can evidence</h3>
            <p className="mt-2 text-sm leading-[1.6] text-fg-body">
              Structured right to work capture with guidance on acceptable documents, plus a full
              audit trail of every upload, approval and consent, timestamped and exportable.
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
              A default UK onboarding template is ready the moment you sign up. Invite a new
              starter in under a minute; approve documents in one click.
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
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-fg">Pricing that scales with you</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {/* Pay per hire */}
            <div className="rounded-xl border border-line bg-ink-raised p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.09em] text-fg-accent">Pay as you go</p>
              <p className="mt-3 text-4xl font-semibold text-fg">
                49.99 GBP <span className="text-base font-normal text-fg-muted">per hire</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm text-fg-body">
                <li className="flex gap-2"><span className="text-fg-accent">-</span> First 3 onboardings free, no card required</li>
                <li className="flex gap-2"><span className="text-fg-accent">-</span> Unlimited templates and reviewers</li>
                <li className="flex gap-2"><span className="text-fg-accent">-</span> Automated reminders and escalations</li>
                <li className="flex gap-2"><span className="text-fg-accent">-</span> Audit trail and CSV export included</li>
              </ul>
              <Link href="/sign-up" className="mt-8 block rounded-md bg-brand px-6 py-3 text-center text-base font-semibold text-on-accent hover:bg-brand-hover">
                Start free
              </Link>
            </div>

            {/* Unlimited / negotiated */}
            <div className="rounded-xl border border-line bg-ink-raised p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.09em] text-fg-accent">Unlimited</p>
              <p className="mt-3 text-4xl font-semibold text-fg">
                Custom pricing
              </p>
              <p className="mt-1 text-sm text-fg-muted">Tailored to your hiring volume and team size</p>
              <ul className="mt-6 space-y-3 text-sm text-fg-body">
                <li className="flex gap-2"><span className="text-fg-accent">-</span> Unlimited new-starter onboardings, no per-hire charge</li>
                <li className="flex gap-2"><span className="text-fg-accent">-</span> Everything in pay-as-you-go</li>
                <li className="flex gap-2"><span className="text-fg-accent">-</span> Priority support for your team</li>
                <li className="flex gap-2"><span className="text-fg-accent">-</span> A plan built around how you actually hire</li>
              </ul>
              <a
                href="mailto:jason@vopria.com?subject=Vopria%20Unlimited%20plan"
                className="mt-8 block rounded-md border border-line-strong px-6 py-3 text-center text-base font-semibold text-fg hover:border-brand hover:text-fg-accent transition-colors"
              >
                Get in touch
              </a>
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
            Your onboarding profile belongs to you
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-[1.6] text-fg-body">
            If your new employer uses Vopria, you will receive an invitation by email.
            Complete your checklist once and your details are saved to your own profile.
            Next time you change jobs, most of it is already done, and you choose exactly
            what each employer can see.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-fg-muted">
          <span>Vopria. Made for UK employers.</span>
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
