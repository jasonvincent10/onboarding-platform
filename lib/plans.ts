// lib/plans.ts
// Single source of truth for what Vopria sells and what it costs. The
// pricing page, the in-app plan chooser, the Stripe checkout and every
// feature gate read from here, so they cannot disagree. Safe to import
// from client components.
//
// PRICING MODEL
//   Two products, one size axis. A customer buys Onboarding, Compliance,
//   or both, and pays according to how many people work for them. Buying
//   both is cheaper than buying them separately.
//
//   free        3 onboardings total, no card. The way in.
//   onboarding  unlimited new-starter onboarding
//   compliance  workforce records + expiry tracking for existing staff
//   complete    both, at a discount
//   custom      over 200 people or bespoke; set by hand, no Stripe gate
//
// Change prices ONLY in MONTHLY_PRICE_PENCE. Nothing needs creating in the
// Stripe dashboard: the subscribe route builds inline price_data from these
// values. Existing subscribers keep the amount stored on their subscription
// until they change plan.

export type PlanModule = 'onboarding' | 'compliance'
export type PaidTier = 'onboarding' | 'compliance' | 'complete'
export type PlanTier = 'free' | PaidTier | 'custom'
export type PlanBand = '25' | '50' | '100' | '200'
export type PlanInterval = 'month' | 'year'

export const FREE_ONBOARDING_LIMIT = 3
export const TRIAL_DAYS = 14
/** Annual plans are charged for this many months, so two months are free. */
export const ANNUAL_MONTHS_CHARGED = 10

export const BANDS: { id: PlanBand; label: string; short: string; maxPeople: number }[] = [
  { id: '25', label: 'Up to 25 people', short: 'Up to 25', maxPeople: 25 },
  { id: '50', label: '26 to 50 people', short: '26 to 50', maxPeople: 50 },
  { id: '100', label: '51 to 100 people', short: '51 to 100', maxPeople: 100 },
  { id: '200', label: '101 to 200 people', short: '101 to 200', maxPeople: 200 },
]

export const MAX_BANDED_PEOPLE = 200

/** Monthly price in pence, per paid tier per headcount band. */
export const MONTHLY_PRICE_PENCE: Record<PaidTier, Record<PlanBand, number>> = {
  onboarding: { '25': 4900, '50': 7900, '100': 10900, '200': 14900 },
  compliance: { '25': 7900, '50': 13900, '100': 22900, '200': 34900 },
  complete: { '25': 9900, '50': 16900, '100': 26900, '200': 39900 },
}

// ─── Naming and copy ─────────────────────────────────────────────────────────

export const PLAN_NAMES: Record<PlanTier, string> = {
  free: 'Free',
  onboarding: 'Onboarding',
  compliance: 'Compliance',
  complete: 'Complete',
  custom: 'Custom',
}

export const MODULE_NAMES: Record<PlanModule, string> = {
  onboarding: 'Onboarding',
  compliance: 'Compliance',
}

export const MODULE_TAGLINES: Record<PlanModule, string> = {
  onboarding: 'Get every new starter ready for day one',
  compliance: 'Keep your existing team in date, all year',
}

export const MODULE_FEATURES: Record<PlanModule, string[]> = {
  onboarding: [
    'Unlimited new-starter onboardings',
    'Right to work, bank details, tax and policy sign-offs',
    'Unlimited checklist templates and reviewers',
    'Automatic reminders and overdue escalation',
    'Full audit trail and CSV export',
  ],
  compliance: [
    'Workforce records for everyone, not just new starters',
    'Requirement library for care, construction, hospitality, logistics and security',
    'Automatic renewal dates for training, licences, checks and medicals',
    'Evidence storage with employee self-service uploads',
    'Reminders before expiry and alerts when someone cannot legally work',
    'Compliance matrix and auditor-ready export',
  ],
}

export const FREE_FEATURES = [
  `Your first ${FREE_ONBOARDING_LIMIT} onboardings, no card required`,
  'Checklist templates, reviewers and reminders',
  'Audit trail and CSV export',
]

// ─── Module and tier conversion ──────────────────────────────────────────────

/** The tier a set of chosen modules maps to. No modules means the free tier. */
export function tierForModules(modules: PlanModule[]): PlanTier {
  const onboarding = modules.includes('onboarding')
  const compliance = modules.includes('compliance')
  if (onboarding && compliance) return 'complete'
  if (compliance) return 'compliance'
  if (onboarding) return 'onboarding'
  return 'free'
}

/** Which modules a tier grants. Custom grants everything. */
export function modulesForTier(tier: PlanTier): Record<PlanModule, boolean> {
  return {
    onboarding: tier === 'onboarding' || tier === 'complete' || tier === 'custom',
    compliance: tier === 'compliance' || tier === 'complete' || tier === 'custom',
  }
}

export function isPaidTier(tier: PlanTier): tier is PaidTier {
  return tier === 'onboarding' || tier === 'compliance' || tier === 'complete'
}

// ─── Prices ──────────────────────────────────────────────────────────────────

export function monthlyPricePence(tier: PaidTier, band: PlanBand): number {
  return MONTHLY_PRICE_PENCE[tier][band]
}

/** What Stripe charges per billing period. Yearly is ANNUAL_MONTHS_CHARGED months. */
export function pricePence(tier: PaidTier, band: PlanBand, interval: PlanInterval): number {
  const monthly = monthlyPricePence(tier, band)
  return interval === 'year' ? monthly * ANNUAL_MONTHS_CHARGED : monthly
}

/** What buying both together saves against buying them separately, per month. */
export function bundleSavingPence(band: PlanBand): number {
  return MONTHLY_PRICE_PENCE.onboarding[band] + MONTHLY_PRICE_PENCE.compliance[band] - MONTHLY_PRICE_PENCE.complete[band]
}

export function bundleSavingPercent(band: PlanBand): number {
  const separate = MONTHLY_PRICE_PENCE.onboarding[band] + MONTHLY_PRICE_PENCE.compliance[band]
  return Math.round((bundleSavingPence(band) / separate) * 100)
}

export function formatPounds(pence: number): string {
  const pounds = pence / 100
  return Number.isInteger(pounds) ? `£${pounds}` : `£${pounds.toFixed(2)}`
}

/** The smallest band that fits a headcount, or null when past the banded range. */
export function bandForHeadcount(count: number): PlanBand | null {
  return BANDS.find((b) => count <= b.maxPeople)?.id ?? null
}

export function bandLabel(band: PlanBand | null): string | null {
  return band ? BANDS.find((b) => b.id === band)?.label ?? null : null
}

// ─── Entitlements ────────────────────────────────────────────────────────────

export interface PlanAccount {
  plan_tier?: string | null
  plan_band?: string | null
  subscription_status?: string | null
  trial_ends_at?: string | null
  current_period_end?: string | null
}

export interface Entitlements {
  tier: PlanTier
  band: PlanBand | null
  status: string
  /** Subscription is in a state that grants the paid features. */
  inGoodStanding: boolean
  unlimitedOnboarding: boolean
  compliance: boolean
  /** Max active people the plan covers, null when uncapped. */
  headcountCap: number | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
}

const GOOD_STANDING = new Set(['active', 'trialing', 'past_due'])
const TIERS: PlanTier[] = ['free', 'onboarding', 'compliance', 'complete', 'custom']

/** Pure: entitlements from an employer_accounts row. Mirrors plan_has_unlimited_onboarding() in SQL. */
export function entitlementsFor(account: PlanAccount | null | undefined): Entitlements {
  const tier = (TIERS.includes(account?.plan_tier as PlanTier) ? account!.plan_tier : 'free') as PlanTier
  const band = (BANDS.some((b) => b.id === account?.plan_band) ? account!.plan_band : null) as PlanBand | null
  const status = account?.subscription_status ?? 'trial'
  const inGoodStanding = tier === 'custom' || (tier !== 'free' && GOOD_STANDING.has(status))
  const paid = tier !== 'free' && inGoodStanding
  const modules = modulesForTier(tier)
  const compliance = paid && modules.compliance
  return {
    tier,
    band,
    status,
    inGoodStanding,
    unlimitedOnboarding: paid && modules.onboarding,
    compliance,
    // The cap only bites on the workforce, so it is meaningless without the
    // compliance module. Custom is uncapped by definition.
    headcountCap: compliance && tier !== 'custom' && band ? BANDS.find((b) => b.id === band)!.maxPeople : null,
    trialEndsAt: account?.trial_ends_at ?? null,
    currentPeriodEnd: account?.current_period_end ?? null,
  }
}
