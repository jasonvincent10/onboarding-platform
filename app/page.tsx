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
      ? 'bg-emerald-500'
      : status === 'submitted'
        ? 'bg-amber-400'
        : 'bg-slate-300'
  return <span className={'inline-block h-2.5 w-2.5 rounded-full ' + color} />
}

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <main className="bg-white text-slate-900">
      {/* Nav */}
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight text-slate-900">Onboarder</span>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#how" className="hidden text-slate-600 hover:text-slate-900 sm:inline">How it works</a>
            <a href="#pricing" className="hidden text-slate-600 hover:text-slate-900 sm:inline">Pricing</a>
            <Link href="/login" className="text-slate-600 hover:text-slate-900">Log in</Link>
            <Link href="/sign-up" className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800">
              Start free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            For UK SMEs hiring 5 to 200 people a year
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Every new starter ready on day one. Every right to work check done properly.
          </h1>
          <p className="mt-5 text-lg leading-7 text-slate-600">
            Getting a right to work check wrong can cost up to 60,000 pounds per worker.
            Onboarder replaces the email chase with one guided checklist: documents, bank
            details, NI number and policy sign-offs, collected, reviewed and logged.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/sign-up" className="rounded-md bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-700">
              Onboard your first 3 hires free
            </Link>
            <span className="text-sm text-slate-500">No card required. Set up in minutes.</span>
          </div>
        </div>

        {/* Hero checklist card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Amara Okafor</p>
              <p className="text-xs text-slate-500">Operations Assistant, starts Monday 20 July</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              80% ready
            </span>
          </div>
          <ul className="mt-5 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {heroItems.map((item) => (
              <li key={item.label} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="flex items-center gap-3 text-slate-800">
                  <StatusDot status={item.status} />
                  {item.label}
                </span>
                <span className="text-xs capitalize text-slate-400">{item.status}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            The dashboard answers one question at a glance: will this person be ready on their start date?
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Compliance you can evidence</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Structured right to work capture with guidance on acceptable documents, plus a full
              audit trail of every upload, approval and consent, timestamped and exportable.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">No more chasing</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Automatic reminders nudge new starters before deadlines and escalate anything
              overdue to you, so nothing gets missed in an inbox.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Built for one person to run</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              A default UK onboarding template is ready the moment you sign up. Invite a new
              starter in under a minute; approve documents in one click.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
          <li className="rounded-lg border border-slate-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Step 1</p>
            <h3 className="mt-2 font-semibold text-slate-900">Invite your new starter</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Enter their name, email and start date. They get a branded invitation from your company.
            </p>
          </li>
          <li className="rounded-lg border border-slate-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Step 2</p>
            <h3 className="mt-2 font-semibold text-slate-900">They complete a guided checklist</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Uploads, forms and policy sign-offs on any device, with clear guidance on what is acceptable.
            </p>
          </li>
          <li className="rounded-lg border border-slate-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Step 3</p>
            <h3 className="mt-2 font-semibold text-slate-900">You review and approve</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              One-click approval or a re-upload request with a note. Export everything as CSV for payroll.
            </p>
          </li>
        </ol>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold tracking-tight">Simple per-hire pricing</h2>
          <div className="mt-8 max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-4xl font-bold text-slate-900">
              25 GBP <span className="text-base font-normal text-slate-500">per hire</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex gap-2"><span className="text-emerald-600">-</span> First 3 onboardings free, no card required</li>
              <li className="flex gap-2"><span className="text-emerald-600">-</span> Unlimited templates and reviewers</li>
              <li className="flex gap-2"><span className="text-emerald-600">-</span> Automated reminders and escalations</li>
              <li className="flex gap-2"><span className="text-emerald-600">-</span> Audit trail and CSV export included</li>
            </ul>
            <Link href="/sign-up" className="mt-8 block rounded-md bg-slate-900 px-6 py-3 text-center text-base font-semibold text-white hover:bg-slate-800">
              Start free
            </Link>
          </div>
        </div>
      </section>

      {/* Employee section */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-xl border border-slate-200 p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Starting a new job?
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Your onboarding profile belongs to you
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            If your new employer uses Onboarder, you will receive an invitation by email.
            Complete your checklist once and your details are saved to your own profile.
            Next time you change jobs, most of it is already done, and you choose exactly
            what each employer can see.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500">
          <span>Onboarder. Made for UK employers.</span>
          <nav className="flex gap-6">
            <Link href="/legal/terms" className="hover:text-slate-900">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link href="/legal/dpa" className="hover:text-slate-900">DPA</Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}