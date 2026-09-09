import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getBillingState } from '@/lib/billing'
import { countActiveEmployments, getEmployerContext } from '@/lib/entitlements'
import { createAdminClient } from '@/lib/supabase/admin'
import { MODULE_NAMES, PLAN_NAMES, bandLabel, modulesForTier, type PlanBand, type PlanInterval, type PlanTier } from '@/lib/plans'
import BillingPortalButton from './BillingPortalButton'
import PlanChooser from '@/components/pricing/PlanChooser'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_LABELS: Record<string, string> = {
  trial: 'Free',
  trialing: 'Free trial',
  active: 'Active',
  past_due: 'Payment overdue',
  cancelled: 'Cancelled',
  unpaid: 'Unpaid',
}

export default async function BillingSettingsPage({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const { billing: flash } = await searchParams
  const ctx = await getEmployerContext()
  if (!ctx) redirect('/login')

  const adminClient = createAdminClient()
  const [billing, activePeople, { data: account }] = await Promise.all([
    getBillingState(ctx.employerId),
    countActiveEmployments(ctx.employerId),
    adminClient
      .from('employer_accounts')
      .select('plan_tier, plan_band, plan_interval, subscription_status, trial_ends_at, current_period_end, stripe_subscription_id')
      .eq('id', ctx.employerId)
      .maybeSingle(),
  ])

  const e = ctx.entitlements
  const modules = modulesForTier(e.tier)
  const included = [modules.onboarding && MODULE_NAMES.onboarding, modules.compliance && MODULE_NAMES.compliance].filter(Boolean) as string[]

  return (
    <div className="space-y-6 max-w-3xl">
      {flash === 'success' && (
        <div className="rounded-lg border border-status-approved/30 bg-status-approved/10 px-4 py-3">
          <p className="text-sm text-status-approved">Thanks. Your plan updates within a few seconds once Stripe confirms it. Refresh if you do not see it yet.</p>
        </div>
      )}
      {flash === 'cancelled' && (
        <div className="rounded-lg border border-line bg-ink-raised px-4 py-3">
          <p className="text-sm text-fg-body">Checkout cancelled. Nothing was charged.</p>
        </div>
      )}

      {/* Current plan */}
      <div className="bg-ink-raised rounded-2xl border border-line shadow-sm">
        <div className="px-6 py-5 border-b border-line">
          <h2 className="text-sm font-semibold text-fg">Your plan</h2>
          <p className="text-sm text-fg-muted mt-0.5">What you are on today and what it covers.</p>
        </div>
        <div className="px-6 py-5 grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs text-fg-muted">Plan</p>
            <p className="font-medium text-fg">{PLAN_NAMES[e.tier]}{e.band ? `, ${bandLabel(e.band)?.toLowerCase()}` : ''}</p>
            <p className="text-xs text-fg-muted">
              {STATUS_LABELS[e.status] ?? e.status}
              {account?.plan_interval ? `, billed ${account.plan_interval === 'year' ? 'yearly' : 'monthly'}` : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-fg-muted">Includes</p>
            <p className="font-medium text-fg">{included.length > 0 ? included.join(' and ') : 'Free onboardings only'}</p>
            <p className="text-xs text-fg-muted">
              {billing?.unlimited
                ? 'Unlimited onboardings'
                : `${billing?.freeRemaining ?? 0} of ${billing?.freeLimit ?? 3} free onboardings left`}
            </p>
          </div>
          <div>
            <p className="text-xs text-fg-muted">Workforce</p>
            {e.compliance ? (
              <>
                <p className="font-medium text-fg">{activePeople} of {e.headcountCap ?? 'unlimited'} people</p>
                <p className="text-xs text-fg-muted">
                  {e.status === 'trialing' && e.trialEndsAt
                    ? `Trial ends ${formatDate(e.trialEndsAt)}`
                    : e.currentPeriodEnd
                      ? `Renews ${formatDate(e.currentPeriodEnd)}`
                      : ''}
                </p>
              </>
            ) : (
              <p className="font-medium text-fg-muted">Not included</p>
            )}
          </div>
        </div>
        {e.status === 'past_due' && (
          <div className="px-6 pb-5">
            <p className="text-sm text-status-pending">Your last payment failed. Update your card in the billing portal to keep your plan.</p>
          </div>
        )}
        {e.tier === 'custom' && (
          <div className="px-6 pb-5">
            <p className="text-sm text-fg-muted">
              You are on a custom plan. <Link href="/contact" className="font-medium text-fg-accent hover:text-fg">Get in touch</Link> to change it.
            </p>
          </div>
        )}
      </div>

      {/* Choose / change plan */}
      {e.tier !== 'custom' && (
        <div className="bg-ink-raised rounded-2xl border border-line shadow-sm">
          <div className="px-6 py-5 border-b border-line">
            <h2 className="text-sm font-semibold text-fg">{e.tier === 'free' ? 'Choose your plan' : 'Change your plan'}</h2>
            <p className="text-sm text-fg-muted mt-0.5">Pick what you need and your size. Changing plan takes effect immediately and Stripe prorates the difference.</p>
          </div>
          <div className="px-6 py-5">
            <PlanChooser
              mode="billing"
              currentTier={e.tier as PlanTier}
              currentBand={e.band as PlanBand | null}
              currentInterval={(account?.plan_interval ?? null) as PlanInterval | null}
              status={e.status}
              activePeople={activePeople}
              hasTrialled={!!account?.trial_ends_at || !!account?.stripe_subscription_id}
            />
          </div>
        </div>
      )}

      {/* Portal */}
      <div className="bg-ink-raised rounded-2xl border border-line shadow-sm">
        <div className="px-6 py-5 border-b border-line">
          <h2 className="text-sm font-semibold text-fg">Invoices and payment method</h2>
          <p className="text-sm text-fg-muted mt-0.5">Update your card, download invoices, or cancel.</p>
        </div>
        <div className="px-6 py-5 space-y-3">
          <BillingPortalButton />
          <p className="text-xs text-fg-muted">Opens Stripe&apos;s secure billing portal in a new page.</p>
        </div>
      </div>
    </div>
  )
}
