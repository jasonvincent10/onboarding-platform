# Task 3.6 + Phase 4 drop-in pack

Files mirror your project structure. Copy each folder into the project root,
then work through the wiring steps below in order.

## IMPORTANT: 3 imports to verify first

These files were written without sight of the live codebase, so verify these
import paths match your actual files and rename if needed:

1. `@/lib/supabase/server` exporting `createClient` (awaited) - used everywhere
2. `@/lib/supabase/admin` exporting `adminClient` (service role) - used everywhere
3. `@/lib/encryption` exporting `decrypt(ciphertext)` - used only in
   `app/api/export/my-data/route.ts` (the SAR export must decrypt NI + bank
   fields for the data subject)

Also check column names against your schema if any differ (e.g.
`employee_profiles.date_of_birth` vs `dob`, `created_at` timestamps).

## Step 1 - SQL migration (run first)

Run `supabase-migrations/002_export_and_billing.sql` in the Supabase SQL
Editor. It adds:
- `audit_action` enum values: `data_exported`, `payment_completed`
- `employer_accounts.paid_credits`
- `consume_onboarding_slot()` and `get_billing_state()` functions

Note: `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block with
other statements in some Postgres versions. If the editor complains, run the
two ALTER TYPE lines on their own first, then the rest.

## Step 2 - Task 3.6 CSV export

Copy: `lib/csv.ts`, `app/api/export/onboardings/route.ts`,
`app/api/export/my-data/route.ts`, `components/ExportButtons.tsx`

Placement decisions I made (change if you prefer):
- Employer bulk export button: dashboard onboardings list header ->
  `<EmployerExportButton />` (all onboardings) and optionally
  `<EmployerExportButton completedOnly />`
- Per-onboarding export: onboarding detail page ->
  `<EmployerExportButton onboardingId={id} />`
- Employee SAR export: employee profile/settings page -> `<SarExportButton />`

Both routes write a `data_exported` row to `audit_log`.

## Step 3 - Stripe (Tasks 4.1 + 4.2)

1. `npm install stripe`
2. Copy: `lib/stripe.ts`, `lib/billing.ts`, `app/api/billing/checkout/route.ts`,
   `app/api/webhooks/stripe/route.ts`, `components/BillingUsage.tsx`
3. Env vars (local `.env.local` AND Vercel project settings):
   - `STRIPE_SECRET_KEY` (test key first: sk_test_...)
   - `STRIPE_WEBHOOK_SECRET` (from step 5)
   - `STRIPE_HIRE_PRICE_PENCE=2500` (optional, defaults to 2500)
4. Wire the billing gate into your EXISTING invitation server action, before
   the onboarding instance is created:

   ```ts
   import { consumeOnboardingSlot } from "@/lib/billing";

   const ok = await consumeOnboardingSlot(employerId);
   if (!ok) {
     return { error: "billing_required" };
   }
   // ...existing code that creates the onboarding instance
   ```

   In the invite form, when you get `billing_required` back, show a message
   and the BillingUsage buy button.
5. Stripe Dashboard -> Developers -> Webhooks -> Add endpoint:
   `https://onboarding-platform-inky.vercel.app/api/webhooks/stripe`
   listening for `checkout.session.completed`. Copy the signing secret into
   `STRIPE_WEBHOOK_SECRET`.
6. CRITICAL: exclude `/api/webhooks/stripe` from your auth middleware matcher,
   exactly like the cron routes, or Stripe's calls will be redirected to login
   and credits will never be granted.
7. Enable Stripe Tax (Dashboard -> Settings -> Tax) since checkout uses
   `automatic_tax: true` for UK VAT. If you do not want Stripe Tax yet, remove
   the `automatic_tax` line from the checkout route.
8. Dashboard usage counter: in your dashboard server component:

   ```ts
   import { getBillingState } from "@/lib/billing";
   import { BillingUsage } from "@/components/BillingUsage";

   const billing = await getBillingState(employerId);
   // in JSX: {billing ? <BillingUsage state={billing} /> : null}
   ```

Test flow: use card 4242 4242 4242 4242 in test mode. Buy a credit, confirm
`paid_credits` increments via the webhook (check the audit_log row too), then
confirm the 4th invitation consumes it.

## Step 4 - Legal pages (Task 4.3)

Copy `app/legal/` (terms, privacy, dpa). Fill in the [PLACEHOLDERS]: legal
entity, address, ICO registration number, contact email, retention period,
dates. Then get a solicitor review before launch - non-negotiable given you
hold NI numbers, bank details and right to work documents. Also register with
the ICO (about 40 GBP/year) if not already done.

## Step 5 - Security hardening (Task 4.4)

1. Copy `lib/security-headers.ts` and `lib/rate-limit.ts`
2. Wire headers into `next.config.ts`:

   ```ts
   import { securityHeaders } from "./lib/security-headers";

   const nextConfig = {
     async headers() {
       return [{ source: "/(.*)", headers: securityHeaders }];
     },
   };
   ```

3. Add rate limiting to sensitive routes. Recommended: login/signup actions,
   `/api/billing/checkout`, both export routes, and the invitation action.
   Example inside a route handler:

   ```ts
   import { rateLimit, clientKey } from "@/lib/rate-limit";

   const check = rateLimit(clientKey(request, "export"), 10, 60_000);
   if (!check.allowed) return new Response("Too many requests", { status: 429 });
   ```

4. After deploying, test the CSP in the browser console - if Supabase realtime
   or Stripe requests are blocked, the console will name the exact directive
   to loosen. The CSP includes `unsafe-inline` for styles because of the raw
   style-tag media-query fallback pattern we use.
5. CSRF: server actions in Next.js App Router have built-in origin checking;
   the new route handlers only perform reads or Stripe-verified writes, so the
   main remaining OWASP items are covered by RLS + headers + rate limits. A
   fuller OWASP pass against the real codebase is still worth a dedicated
   session once everything above is merged (that is the true Task 4.4 scope).

## Step 6 - Error tracking (Task 4.5)

Sentry's setup is wizard-driven and version-specific, so rather than shipping
config files that may not match your Next.js version, run:

```
npx @sentry/wizard@latest -i nextjs
```

in the project root. It creates the config files, wires source maps into the
Vercel build, and asks for your Sentry DSN. Add `SENTRY_AUTH_TOKEN` to Vercel
when prompted. Then add breadcrumb logging for key events where convenient:

```ts
import * as Sentry from "@sentry/nextjs";
Sentry.captureMessage("onboarding_completed", { level: "info" });
```

Uptime: enable a free monitor (e.g. UptimeRobot or Sentry Uptime) pointed at
the landing page URL.

## Step 7 - Landing page (Task 4.6)

`app/landing/page.tsx` is self-contained. If your root `app/page.tsx` is
currently a redirect, move this content there instead; otherwise keep it at
`/landing`. Adjust `/signup` and `/login` hrefs to your actual auth routes.

## Step 8 - Deploy

`git add`, commit, `git push` (the Vercel Redeploy button will not pick up new
files). Set the new env vars in Vercel BEFORE pushing, or the build will fail
on the Stripe import at runtime.

## CONTEXT.md updates

Tick off: 3.6, 4.1, 4.2, 4.3 (draft done, solicitor pending), 4.4 (headers +
rate limiting done, full OWASP review pending), 4.5 (wizard step pending),
4.6. New decisions to record:
- Billing model: credit-based per-hire. 3 free, then 1 credit per onboarding,
  granted only via Stripe webhook (idempotent via audit_log check on session id)
- `consume_onboarding_slot()` Postgres function makes the billing gate atomic
- Exports audit-logged with new `data_exported` enum value
- Webhook route excluded from auth middleware matcher
