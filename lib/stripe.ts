// lib/stripe.ts
// Stripe client singleton. Requires: npm install stripe
// Env: STRIPE_SECRET_KEY

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

// Per-hire price in pence. Default 4999 (49.99 GBP). Override with env var.
export function getHirePricePence(): number {
  const raw = process.env.STRIPE_HIRE_PRICE_PENCE;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4999;
}
