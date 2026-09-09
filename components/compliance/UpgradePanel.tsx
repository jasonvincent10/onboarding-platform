import Link from 'next/link'
import { MODULE_FEATURES, MONTHLY_PRICE_PENCE, TRIAL_DAYS, formatPounds } from '@/lib/plans'

export default function UpgradePanel({ feature }: { feature: 'workforce' | 'compliance' }) {
  const heading = feature === 'workforce' ? 'Keep your whole workforce in one place' : 'Track every certificate, licence and check before it expires'
  return (
    <div className="bg-ink-raised rounded-2xl border border-line shadow-sm overflow-hidden max-w-3xl">
      <div className="h-1.5 bg-gradient-to-r from-brand via-brand-hover to-brand-deep" />
      <div className="px-8 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.09em] text-fg-accent">Compliance</p>
        <h2 className="mt-2 text-xl font-semibold text-fg">{heading}</h2>
        <p className="mt-2 text-sm text-fg-body max-w-xl leading-relaxed">
          Load your existing staff, tick the requirements that apply to your sector, and let Vopria work out
          what is due when. Reminders go to the right person before anything lapses, and a single view
          tells you who can legally work tomorrow.
        </p>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {MODULE_FEATURES.compliance.map((f) => (
            <li key={f} className="flex gap-2 text-sm text-fg-body">
              <span className="text-fg-accent">-</span>
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href="/settings/billing" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition">
            Start a {TRIAL_DAYS}-day free trial
          </Link>
          <span className="text-sm text-fg-muted">
            From {formatPounds(MONTHLY_PRICE_PENCE.compliance['25'])} a month for up to 25 people. No card needed for the trial.
          </span>
        </div>
      </div>
    </div>
  )
}
