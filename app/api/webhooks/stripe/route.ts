// app/api/webhooks/stripe/route.ts
// Stripe webhook. Two responsibilities:
//   1. One-off onboarding credits (legacy pay-as-you-go): granted only here,
//      after payment is confirmed, never on the client redirect.
//   2. Subscriptions: every subscription event writes plan_tier, plan_band,
//      subscription_status and period dates onto employer_accounts. This is
//      the ONLY place those columns change (apart from manual 'custom').
//
// Stripe Dashboard -> Developers -> Webhooks -> events to send:
//   checkout.session.completed, customer.subscription.created,
//   customer.subscription.updated, customer.subscription.deleted,
//   invoice.payment_failed, invoice.paid
// Signing secret in STRIPE_WEBHOOK_SECRET. Route is excluded from the auth
// middleware matcher.

import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

const adminClient = createAdminClient()

function mapStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case 'trialing': return 'trialing'
    case 'active': return 'active'
    case 'past_due': return 'past_due'
    case 'unpaid': return 'unpaid'
    case 'canceled':
    case 'incomplete_expired': return 'cancelled'
    case 'incomplete':
    case 'paused':
    default: return status
  }
}

async function findEmployerId(sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.employer_id
  if (fromMeta) return fromMeta
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const { data } = await adminClient.from('employer_accounts').select('id').eq('stripe_customer_id', customerId).maybeSingle()
  return data?.id ?? null
}

async function applySubscription(sub: Stripe.Subscription, eventId: string, eventType: string) {
  const employerId = await findEmployerId(sub)
  if (!employerId) {
    console.error('[stripe webhook] no employer for subscription', sub.id)
    return
  }

  const ended = sub.status === 'canceled' || sub.status === 'incomplete_expired'
  const paidTiers = ['onboarding', 'compliance', 'complete']
  const tier = ended ? 'free' : (sub.metadata?.tier && paidTiers.includes(sub.metadata.tier) ? sub.metadata.tier : 'free')
  const band = !ended && sub.metadata?.band && ['25', '50', '100', '200'].includes(sub.metadata.band) ? sub.metadata.band : null
  const interval = !ended && (sub.metadata?.interval === 'year' || sub.metadata?.interval === 'month') ? sub.metadata.interval : null

  const { error } = await adminClient
    .from('employer_accounts')
    .update({
      plan_tier: tier,
      plan_band: band,
      plan_interval: interval,
      subscription_status: ended ? 'cancelled' : mapStatus(sub.status),
      stripe_subscription_id: ended ? null : sub.id,
      current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      plan_updated_at: new Date().toISOString(),
    })
    .eq('id', employerId)
  if (error) {
    console.error('[stripe webhook] account update failed:', error.message)
    return
  }

  const { error: auditError } = await adminClient.from('audit_log').insert({
    actor_id: null,
    actor_type: 'system',
    action: 'subscription_updated',
    resource_type: 'stripe_subscription',
    resource_id: sub.id,
    employer_id: employerId,
    metadata: { event_id: eventId, event_type: eventType, status: sub.status, tier, band, interval },
  })
  if (auditError) console.error('[stripe webhook] audit insert failed:', auditError.message)
}

async function grantCredits(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return
  const employerId = session.metadata?.employer_id
  const credits = parseInt(session.metadata?.credits || '1', 10) || 1
  if (!employerId) return

  // Idempotency: skip if this session was already processed
  const { data: existing } = await adminClient
    .from('audit_log')
    .select('id')
    .eq('action', 'payment_completed')
    .eq('resource_id', session.id)
    .maybeSingle()
  if (existing) return

  const { data: employer } = await adminClient.from('employer_accounts').select('paid_credits').eq('id', employerId).maybeSingle()
  if (!employer) return

  await adminClient
    .from('employer_accounts')
    .update({ paid_credits: (employer.paid_credits ?? 0) + credits })
    .eq('id', employerId)

  const { error } = await adminClient.from('audit_log').insert({
    actor_id: null,
    actor_type: 'system',
    action: 'payment_completed',
    resource_type: 'stripe_checkout_session',
    resource_id: session.id,
    employer_id: employerId,
    metadata: { credits_added: credits, amount_total_pence: session.amount_total },
  })
  if (error) console.error('[stripe webhook] payment audit insert failed:', error.message)
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return new Response('Webhook secret not configured', { status: 500 })

  const signature = request.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })

  const rawBody = await request.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
          const sub = await stripe.subscriptions.retrieve(subId)
          // Session metadata is the source of truth for tier/band if the
          // subscription metadata was not copied for any reason.
          if (!sub.metadata?.tier && session.metadata?.tier) {
            await stripe.subscriptions.update(sub.id, { metadata: session.metadata })
            sub.metadata = { ...sub.metadata, ...session.metadata }
          }
          await applySubscription(sub, event.id, event.type)
        } else {
          await grantCredits(session)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await applySubscription(event.data.object as Stripe.Subscription, event.id, event.type)
        break
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId)
          await applySubscription(sub, event.id, event.type)
        }
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('[stripe webhook] handler error:', err)
    return new Response('Handler error', { status: 500 })
  }

  return Response.json({ received: true })
}
