// app/api/billing/subscribe/route.ts
// POST { tier: 'onboarding' | 'compliance' | 'complete', band: '25'|'50'|'100'|'200', interval: 'month'|'year' }
//
// New subscribers get a Stripe Checkout session in subscription mode, with a
// no-card trial the first time. Existing subscribers have their subscription
// changed in place (Stripe prorates) and the webhook updates the account.
// Prices are inline price_data built from lib/plans.ts, so nothing needs
// creating in the Stripe dashboard.

import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEmployerContext } from '@/lib/entitlements'
import { getStripe } from '@/lib/stripe'
import {
  BANDS,
  MODULE_NAMES,
  PLAN_NAMES,
  TRIAL_DAYS,
  bandLabel,
  modulesForTier,
  pricePence,
  type PaidTier,
  type PlanBand,
  type PlanInterval,
} from '@/lib/plans'
import { rateLimit } from '@/lib/rate-limit'

const PAID_TIERS: PaidTier[] = ['onboarding', 'compliance', 'complete']

export async function POST(request: Request) {
  const ctx = await getEmployerContext()
  if (!ctx) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const limited = rateLimit('subscribe:' + ctx.userId, 10, 60_000)
  if (!limited.allowed) return Response.json({ error: 'Too many requests' }, { status: 429 })

  let body: { tier?: string; band?: string; interval?: string } = {}
  try {
    body = await request.json()
  } catch {
    // empty body handled below
  }

  const tier = PAID_TIERS.includes(body.tier as PaidTier) ? (body.tier as PaidTier) : null
  const interval: PlanInterval = body.interval === 'year' ? 'year' : 'month'
  const band = BANDS.some((b) => b.id === body.band) ? (body.band as PlanBand) : null
  if (!tier) return Response.json({ error: 'Choose at least one of Onboarding or Compliance.' }, { status: 400 })
  if (!band) return Response.json({ error: 'Choose how many people work for you.' }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: employer } = await adminClient
    .from('employer_accounts')
    .select('id, company_name, stripe_customer_id, stripe_subscription_id, subscription_status, trial_ends_at, plan_tier')
    .eq('id', ctx.employerId)
    .maybeSingle()
  if (!employer) return Response.json({ error: 'Employer account not found' }, { status: 404 })

  // A band has to cover the workforce actually being tracked. Only matters
  // when the chosen plan includes compliance, since nothing else counts
  // against headcount.
  if (modulesForTier(tier).compliance) {
    const { count } = await adminClient
      .from('employments')
      .select('id', { count: 'exact', head: true })
      .eq('employer_id', ctx.employerId)
      .eq('status', 'active')
    const max = BANDS.find((b) => b.id === band)!.maxPeople
    if ((count ?? 0) > max) {
      return Response.json({ error: `You have ${count} active people, which is more than the ${max} this size covers. Choose a larger size, or mark leavers first.` }, { status: 400 })
    }
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim()
  const unitAmount = pricePence(tier, band, interval)
  const modules = modulesForTier(tier)
  const included = [modules.onboarding && MODULE_NAMES.onboarding, modules.compliance && MODULE_NAMES.compliance].filter(Boolean).join(' and ')
  const productName = `Vopria ${PLAN_NAMES[tier]} (${bandLabel(band)})`
  const metadata = { employer_id: employer.id, tier, band, interval }

  try {
    const stripe = getStripe()

    let customerId = employer.stripe_customer_id as string | null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: ctx.userEmail ?? undefined,
        name: employer.company_name,
        metadata: { employer_id: employer.id },
      })
      customerId = customer.id
      await adminClient.from('employer_accounts').update({ stripe_customer_id: customerId }).eq('id', employer.id)
    }

    // In-place change for an existing live subscription: no second checkout,
    // Stripe prorates the difference.
    const live = employer.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(employer.subscription_status ?? '')
    if (live) {
      const sub = await stripe.subscriptions.retrieve(employer.stripe_subscription_id as string)
      const item = sub.items.data[0]
      await stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price_data: { currency: 'gbp', unit_amount: unitAmount, recurring: { interval }, product: item.price.product as string } }],
        proration_behavior: 'create_prorations',
        metadata,
      })
      return Response.json({ changed: true })
    }

    const neverTrialled = !employer.trial_ends_at && !employer.stripe_subscription_id
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'gbp',
            unit_amount: unitAmount,
            recurring: { interval },
            product_data: { name: productName, description: `${included}, billed ${interval === 'year' ? 'yearly' : 'monthly'}` },
          } satisfies Stripe.Checkout.SessionCreateParams.LineItem.PriceData,
        },
      ],
      subscription_data: {
        metadata,
        ...(neverTrialled ? { trial_period_days: TRIAL_DAYS } : {}),
      },
      payment_method_collection: neverTrialled ? 'if_required' : 'always',
      allow_promotion_codes: true,
      metadata,
      success_url: appUrl + '/settings/billing?billing=success',
      cancel_url: appUrl + '/settings/billing?billing=cancelled',
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('Subscription checkout failed:', err)
    const message = err instanceof Error ? err.message : 'Could not start checkout.'
    return Response.json({ error: message }, { status: 502 })
  }
}
