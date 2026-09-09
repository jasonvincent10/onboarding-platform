'use client'

// One chooser, two homes: the public pricing section and Settings, Billing.
// The customer answers two questions, what do you need and how big are you,
// and gets one price. Both modes read the same constants from lib/plans.ts,
// so marketing and checkout can never quote different numbers.
//
// Client components cannot take function props from a server component, so
// the mode prop decides what the call to action does rather than a callback.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BANDS,
  MODULE_FEATURES,
  MODULE_NAMES,
  MODULE_TAGLINES,
  MONTHLY_PRICE_PENCE,
  PLAN_NAMES,
  TRIAL_DAYS,
  bandForHeadcount,
  bundleSavingPence,
  formatPounds,
  isPaidTier,
  modulesForTier,
  pricePence,
  tierForModules,
  type PlanBand,
  type PlanInterval,
  type PlanModule,
  type PlanTier,
} from '@/lib/plans'

interface Props {
  mode: 'marketing' | 'billing'
  currentTier?: PlanTier
  currentBand?: PlanBand | null
  currentInterval?: PlanInterval | null
  status?: string
  activePeople?: number
  hasTrialled?: boolean
}

const MODULES: PlanModule[] = ['onboarding', 'compliance']

export default function PlanChooser({
  mode,
  currentTier = 'free',
  currentBand = null,
  currentInterval = null,
  status = 'trial',
  activePeople = 0,
  hasTrialled = false,
}: Props) {
  const router = useRouter()
  const live = currentTier !== 'free' && currentTier !== 'custom' && ['active', 'trialing', 'past_due'].includes(status)
  const currentModules = modulesForTier(currentTier)

  const [selected, setSelected] = useState<Record<PlanModule, boolean>>(
    live ? currentModules : { onboarding: true, compliance: true }
  )
  // Default to the band that actually fits them: their current one if they
  // have a plan, otherwise the smallest that covers their live headcount.
  const [band, setBand] = useState<PlanBand>(currentBand ?? bandForHeadcount(Math.max(activePeople, 1)) ?? '200')
  const [interval, setInterval] = useState<PlanInterval>(currentInterval === 'year' ? 'year' : 'month')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chosen = useMemo(() => MODULES.filter((m) => selected[m]), [selected])
  const tier = tierForModules(chosen)
  const paid = isPaidTier(tier)
  const monthly = paid ? MONTHLY_PRICE_PENCE[tier][band] : 0
  const charged = paid ? pricePence(tier, band, interval) : 0
  const saving = bundleSavingPence(band)
  const bothChosen = selected.onboarding && selected.compliance

  const isCurrent =
    live &&
    tier === currentTier &&
    band === currentBand &&
    (currentInterval ?? 'month') === interval

  async function subscribe() {
    if (!paid) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, band, interval }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not start checkout.')
        return
      }
      if (data.url) {
        window.location.href = data.url
        return
      }
      if (data.changed) router.refresh()
    } catch {
      setError('Could not reach billing. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Step 1: modules */}
      <div>
        <p className="text-sm font-semibold text-fg">1. What do you need?</p>
        <p className="mt-0.5 text-sm text-fg-muted">Pick one or both. Most people take both, which costs less than buying them separately.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {MODULES.map((m) => {
            const on = selected[m]
            return (
              <button key={m} type="button" onClick={() => setSelected((s) => ({ ...s, [m]: !s[m] }))} className={`rounded-xl border p-5 text-left transition ${on ? 'border-brand bg-brand/10 ring-1 ring-brand/30' : 'border-line bg-ink-raised hover:border-line-strong'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-fg">{MODULE_NAMES[m]}</p>
                    <p className="mt-0.5 text-sm text-fg-muted">{MODULE_TAGLINES[m]}</p>
                  </div>
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? 'border-brand bg-brand' : 'border-line-strong'}`}>
                    {on && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-fg-body">{formatPounds(MONTHLY_PRICE_PENCE[m][band])} a month at your size</p>
                <ul className="mt-3 space-y-1.5">
                  {MODULE_FEATURES[m].map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-fg-body">
                      <span className="text-fg-accent">-</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: size */}
      <div>
        <p className="text-sm font-semibold text-fg">2. How many people work for you?</p>
        <p className="mt-0.5 text-sm text-fg-muted">Everyone on the payroll, not just the ones you are hiring this month.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BANDS.map((b) => (
            <button key={b.id} type="button" onClick={() => setBand(b.id)} className={`rounded-lg border px-3 py-2.5 text-center transition ${band === b.id ? 'border-brand bg-brand/15 text-fg-accent' : 'border-line text-fg-body hover:border-line-strong'}`}>
              <span className="block text-sm font-medium">{b.short}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-fg-muted">
          More than 200 people?{' '}
          <Link href="/contact" className="font-medium text-fg-accent hover:text-fg">Ask about a custom plan</Link>.
        </p>
      </div>

      {/* Step 3: result */}
      <div className="rounded-xl border border-line bg-ink-raised p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-fg">3. Your plan</p>
          <div className="flex rounded-lg border border-line bg-ink-inset p-0.5">
            <button type="button" onClick={() => setInterval('month')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${interval === 'month' ? 'bg-brand/15 text-fg-accent' : 'text-fg-muted hover:text-fg'}`}>Monthly</button>
            <button type="button" onClick={() => setInterval('year')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${interval === 'year' ? 'bg-brand/15 text-fg-accent' : 'text-fg-muted hover:text-fg'}`}>Yearly, 2 months free</button>
          </div>
        </div>

        {paid ? (
          <>
            <p className="mt-4 text-4xl font-semibold text-fg">
              {formatPounds(monthly)} <span className="text-base font-normal text-fg-muted">a month</span>
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              {PLAN_NAMES[tier]} for {BANDS.find((b) => b.id === band)!.label.toLowerCase()}.
              {interval === 'year' ? ` Billed ${formatPounds(charged)} a year.` : ' Billed monthly.'} Excludes VAT.
            </p>
            {bothChosen && (
              <p className="mt-2 inline-block rounded-full bg-status-approved/15 px-3 py-1 text-xs font-semibold text-status-approved">
                Saves {formatPounds(saving)} a month against buying them separately
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mt-4 text-4xl font-semibold text-fg">Nothing selected</p>
            <p className="mt-1 text-sm text-fg-muted">Choose Onboarding, Compliance or both above to see your price.</p>
          </>
        )}

        {error && <p className="mt-3 text-sm text-status-rejected">{error}</p>}

        <div className="mt-5">
          {mode === 'marketing' ? (
            <Link href="/sign-up" className="inline-block rounded-lg bg-brand px-6 py-3 text-base font-semibold text-on-accent hover:bg-brand-hover">
              Start free, upgrade when you are ready
            </Link>
          ) : (
            <button type="button" disabled={!paid || busy || isCurrent} onClick={subscribe} className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60 transition">
              {isCurrent ? 'This is your current plan' : busy ? 'Opening checkout...' : live ? 'Switch to this plan' : hasTrialled ? `Subscribe to ${PLAN_NAMES[tier]}` : `Start ${TRIAL_DAYS}-day free trial`}
            </button>
          )}
          {mode === 'billing' && !live && !hasTrialled && paid && (
            <p className="mt-2 text-xs text-fg-muted">No card needed for the trial. Cancel any time before it ends.</p>
          )}
          {mode === 'billing' && activePeople > 0 && (
            <p className="mt-2 text-xs text-fg-muted">You currently have {activePeople} active {activePeople === 1 ? 'person' : 'people'} in your workforce.</p>
          )}
        </div>
      </div>
    </div>
  )
}
