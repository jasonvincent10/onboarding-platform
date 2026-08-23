# PROJECT CONTEXT — UK Employee Onboarding Platform

> Paste this at the top of every new Claude conversation before giving your task prompt.
> Update it as you make decisions and complete tasks.

---

## What I'm building

A UK employee onboarding platform for SMEs (20–200 employees). Two user types:
- **Employers** — HR managers, office managers, or founders who set up onboarding and review submissions
- **Employees** — new starters who complete a guided checklist of documents and forms

The core differentiator is a **portable employee profile**: documents and data attach to the employee, not the employer, so returning users arrive at a new employer's onboarding already partially complete.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.2.1 App Router (Turbopack) |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes + Server Actions |
| Database | Supabase (PostgreSQL) — EU region, project ref `hhdapipznswdeqsxedmy` |
| Auth | Supabase Auth (email/password + magic links) |
| File storage | Supabase Storage |
| Email | Resend |
| Hosting | Vercel (London lhr1) |
| Payments | Stripe (per-hire billing — code in place, not yet enforced) |
| Error tracking | Sentry (installed via wizard, tracing + logs enabled) |
| Package manager | **npm only** — never yarn or pnpm |

**Live URL:** https://onboarding-platform-inky.vercel.app
**GitHub:** jasonvincent10/onboarding-platform (master branch)
**Local path:** `C:\Users\jason\OneDrive\Documents\Client Onboarder\onboarding-platform-scaffold\onboarding-platform`
(Run all terminal commands from the `onboarding-platform` subfolder, NOT the parent scaffold folder.)

---

## Database schema (10 tables, all RLS-enabled)

- `employer_accounts` — id, company_name, company_number, stripe_customer_id, subscription_status, onboardings_used, paid_credits
- `employer_members` — id, employer_id → employer_accounts, user_id → auth.users, role, full_name, email
- `employee_profiles` — id, user_id → auth.users, full_name, email, DOB, address, phone, ni_number_encrypted, bank_sort_code_encrypted, bank_account_number_encrypted, bank_account_holder_name, emergency_contacts (JSONB), right_to_work_status, right_to_work_expiry
- `onboarding_templates` — id, employer_id, template_name, role_type, is_default
- `template_items` — id, template_id, item_name, description, item_type (enum), data_category (enum), form_field_key, policy_document_path, sort_order, deadline_days_before_start
- `onboarding_instances` — id, employer_id, employee_id, template_id, invitee_name, invitee_email, role_title, start_date, invitation_token, status, readiness_pct
- `checklist_items` — id, onboarding_id, template_item_id, item_name, description, item_type, data_category, form_field_key, policy_document_path, status (enum), deadline, document_upload_id, acknowledged_at, reviewed_by, reviewer_notes, was_pre_populated
- `document_uploads` — id, employee_id, document_type, document_name, file_path, data_category, verification_status, expiry_date
- `consent_records` — id, employee_id, employer_id, data_category, action (granted/withdrawn), onboarding_id. **APPEND-ONLY.**
- `audit_log` — id, actor_id, actor_type, action (enum), resource_type, resource_id, employer_id, employee_id, metadata (JSONB). **APPEND-ONLY.**

### Key architectural decisions
- Documents attach to **employee profile**, not onboarding instance (portability)
- Template items are COPIED into checklist_items when onboarding is created (templates can change without affecting active onboardings)
- Sensitive fields use `_encrypted` suffix — AES-256-GCM encrypted at app level before DB write
- Consent is append-only (grant/withdraw creates new rows, latest row wins)
- `data_category` enum links template items → documents → consent (drives granular sharing)
- `employer_members` join table supports future multi-user per org
- **`employee_id` on `onboarding_instances` stores `employee_profiles.id`, NOT `auth.users.id`** — use `getProfileIdForUser()` to translate
- Data categories: personal_info, ni_number, bank_details, emergency_contacts, right_to_work, documents, policy_acknowledgements
- Billing model: credit-based per-hire. 3 free onboardings, then 1 paid credit per onboarding. Credits granted only via Stripe webhook (idempotent check against audit_log session id). `consume_onboarding_slot()` Postgres function makes the billing gate atomic. **Billing gate not yet wired into invitation flow — operating on free/BACS basis for early customers.**

### RLS / helper functions
- Helper functions: `get_my_employer_id()`, `get_my_employee_id()`, `has_active_consent()`
- Employers see only their own org data; employees see only their own profile/documents/onboardings
- Employer access to documents requires BOTH active onboarding + active consent for that data_category
- consent_records and audit_log: INSERT + SELECT only (no UPDATE/DELETE)

### Utility / SQL functions
- `create_default_template(employer_id)` — creates Standard UK Onboarding template with 8 items on signup
- `get_consent_status_for_employer(employee_id, employer_id)` — returns latest action per category (migration 003, index `idx_consent_records_lookup`)
- `recalculate_onboarding_status(UUID)` — recalculates readiness; trigger `checklist_status_changed` fires on checklist_items changes
- `consume_onboarding_slot(employer_id)` — atomic billing gate; returns true if slot consumed (migration 002)
- `get_billing_state(employer_id)` — returns onboardings_used, free_limit, paid_credits, can_start (migration 002)
- NOTE: there are two overloaded `create_onboarding_from_template` functions in the DB, but **neither is actually called by the app** — the invite flow copies template_items → checklist_items via a direct `.insert()` in `app/(employer)/dashboard/invite/actions.ts`.

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_HIRE_PRICE_PENCE=2500
NEXT_PUBLIC_APP_URL=https://onboarding-platform-inky.vercel.app
ENCRYPTION_KEY=        # 64-char hex (32 bytes), AES-256-GCM. MUST be set in Vercel env vars too, not just .env.local
CRON_SECRET=           # cron route auth
SENTRY_AUTH_TOKEN=     # needed in Vercel for production source maps — add via Sentry wizard output
```
- Encryption env var is `ENCRYPTION_KEY` (NOT FIELD_ENCRYPTION_KEY)
- Admin client export is `createAdminClient()` — NOT a pre-built `adminClient` instance. Pattern: `const adminClient = createAdminClient()` at the top of each function/route.
- Encryption export is `decryptField()` — NOT `decrypt()`

---

## Build status

### Phase 1 — Foundation
- [x] 1.1 Project setup
- [x] 1.2 Database schema design
- [x] 1.3 Employer auth + empty dashboard
- [x] 1.4 Onboarding template builder
- [x] 1.5 Employee invitation flow
- [x] 1.6 Employee portal / checklist view

### Phase 2 — Core Functionality
- [x] 2.1 Document upload system
- [x] 2.2 Form-based data entry (NI, bank, emergency)
- [x] 2.3 Policy acknowledgement
- [x] 2.4 Employer review workflow
- [x] 2.5 Status engine
- [x] 2.6 Automated email reminders

### Phase 3 — Portability & Polish
- [x] 3.1 Portable profile logic
- [x] 3.2 Consent management
- [x] 3.3 Right to work guidance
- [x] 3.4 UI polish + responsive design
- [x] 3.5 Audit trail
- [x] 3.6 Data export CSV

### Phase 4 — Billing & Launch
- [x] 4.1 Stripe integration (billing gate now enforced in the invite flow as of Aug 2026 — see Fixed section below)
- [x] 4.2 Free trial / pilot mode (BillingUsage component on dashboard; counter live)
- [x] 4.3 Legal pages (drafts live at /legal/terms, /legal/privacy, /legal/dpa — placeholders remain, solicitor review required before launch)
- [x] 4.4 Security hardening (CSP + security headers in next.config.js; rate-limit utility at lib/rate-limit.ts; full OWASP pass still TODO)
- [x] 4.5 Error tracking (Sentry installed via wizard, tracing + logs enabled; add SENTRY_AUTH_TOKEN to Vercel for source maps)
- [x] 4.6 Landing page (live at root /; logged-in users redirect to /dashboard)

---

## Recurring gotchas (apply to EVERY task)

- **`await createClient()`** everywhere — Next.js 16 made `cookies()` async; forgetting this causes subtle failures
- **Use `adminClient` (service role) for all RLS-protected writes** — checklist_items, employee_profiles, consent records, portability/document queries. Regular client + RLS is too aggressive for these.
- **Admin client pattern:** `import { createAdminClient } from '@/lib/supabase/admin'` then `const adminClient = createAdminClient()` — the module exports a factory function, NOT a singleton instance.
- **Encryption function:** `import { decryptField } from '@/lib/encryption'` — NOT `decrypt`.
- **`.maybeSingle()` not `.single()`** when a row may not exist — `.single()` errors on zero rows and silently breaks conditional logic
- **`upsert` with `onConflict`** for any get-or-create pattern — select-then-insert is race-prone
- **Do NOT use `employer_accounts!inner` (or similar) joins** — they silently return null. Fetch with separate two-step queries. Supabase can't auto-traverse indirect relationships in nested selects.
- **Keep JSX attributes on a single line**, and keep multi-line TS generics (`Record<...>`) on one line or extract to a named type — both cause Turbopack/parser errors in this setup. Avoid non-ASCII symbols (↗, …, HTML entities) in JSX.
- **Client Components can't receive function props from Server Components** — pass data only; do redirects via `useRouter().push()/refresh()` inside the client component
- **`audit_action` enum must be kept up to date** — missing values cause silent insert failures. `data_exported` and `payment_completed` added in migration 002.
- **Always check the `error` returned from an `audit_log` insert** — silent failures look identical to "code never ran."
- **`reviewed_by`** is a FK to `auth.users` — use `user.id`, not `member.id`
- **Turbopack can serve a stale server-component render** on the first reload after a data change — reload a second time before concluding a guard/redirect is broken
- **Page files must be named exactly `page.tsx`** — Next.js won't route `page-foo.tsx` etc.
- **`useSearchParams()` must be wrapped in `<Suspense>`** for static prerender
- **Consent is append-only** — NEVER UPDATE/DELETE consent_records; withdrawal = INSERT new row with `action = 'withdrawn'`
- **Vercel redeploy button re-runs the existing commit** — new local files require `git push` first
- **middleware.ts is now `proxy.ts`** in Next.js 16; needs `/join` AND `/employee-login` in both PUBLIC_ROUTES and ALWAYS_ACCESSIBLE. Also exclude `/api/webhooks/stripe` from auth matcher (same pattern as cron routes).
- **Resend free tier** only delivers to the verified signup address during dev; from address `onboarding@resend.dev`; email confirmation must be OFF in Supabase Auth settings
- **Testing:** two entirely different browsers for simultaneous employer/employee sessions (same-browser incognito shares the cookie jar)
- **Tailwind dynamic/responsive classes inside template literals can silently fail to generate** — for critical show/hide breakpoint logic, prefer a raw `<style>` tag with a real `@media` query over `lg:` prefixes combined with conditional className strings.
- **Chrome DevTools device toolbar can fail to trigger real resize/media-query re-evaluation** — test with an actual browser window resize before assuming the code is broken.
- **Duplicate JSX bug pattern (pre-existing):** BankDetailsForm.tsx, EmergencyContactsForm.tsx, and onboarding item/checklist pages had dead code appended after the closing return statement — a second copy of the JSX using inline styles. This caused Turbopack production build failures. Fixed in Jul 2026 session. Watch for this pattern if adding to these files.
- **CSP `unsafe-eval` in dev:** next.config.js injects `unsafe-eval` into script-src only when `NODE_ENV === 'development'` — React dev tools need it. Not present in production builds.
- **A stray leading/trailing space pasted into a Vercel env var value is invisible in the dashboard UI but breaks anything that concatenates it into a URL.** Found via `NEXT_PUBLIC_APP_URL` having a leading space, making Stripe Checkout's `success_url` start with a space — Stripe rejected it with a generic `url_invalid` "Not a valid URL" error that gave zero indication it was whitespace. `app/api/billing/checkout/route.ts` now `.trim()`s this env var defensively, but if a similarly opaque failure shows up elsewhere, suspect this pattern — retype the env var value from scratch in Vercel rather than trying to spot/delete the invisible character.

---

## File / route map

- Employee routes: `app/(employee)/employee/dashboard`, `.../onboarding/[id]`, `.../onboarding/[id]/item/[itemId]/page.tsx`
- Employee login: `/employee-login` (route group `(auth)` is invisible in the URL)
- Join flow: `/join?token=xxx` → `acceptInvitation()` in `app/join/actions.ts`
- Employer invite: `app/(employer)/dashboard/invite/` (page.tsx + InviteForm.tsx + actions.ts)
- Employer review: `app/(employer)/dashboard/onboarding/[id]/`
- Admin client: `lib/supabase/admin.ts` (`createAdminClient()` factory)
- Encryption: `lib/encryption.ts` (AES-256-GCM; format `iv.authTag.ciphertext`, dot-separated base64; export `decryptField`)
- Forms: `components/forms/` — NINumberForm, BankDetailsForm, EmergencyContactsForm, FormEntryHandler (routes on form_field_key), PolicyAcknowledgement, RightToWorkUpload
- Form/policy/RTW actions: `lib/actions/form-actions.ts`, `policy-actions.ts`, `rtw-actions.ts`
- Portability: `lib/portability/categories.ts`, `lib/portability/profile-matcher.ts`, `lib/actions/portability-actions.ts`, `components/portability/PortableProfileReview.tsx`, review page `app/(employee)/employee/onboarding/[id]/review/page.tsx`
- Consent service: `lib/consent.ts` (DATA_CATEGORIES, CATEGORY_INFO, getRequiredCategories, getConsentStatus, hasActiveConsent, grantConsent, withdrawConsent); standing management page `/employee/consents`
- Upload: `components/upload/DocumentUpload.tsx`; storage bucket `employee-documents` (private, 10MB, PDF/JPG/PNG); path `{user_id}/{document_type_slug}_{timestamp}.{ext}`
- Email: `lib/email/invite-template.ts`, `lib/email/reminder-templates.ts`
- Cron: `app/api/cron/check-overdue/route.ts` (7am UTC), `app/api/cron/reminders/route.ts` (8am UTC, REMINDER_WINDOW_DAYS=3); cron routes excluded from auth middleware via api/cron matcher pattern
- Export routes: `app/api/export/onboardings/route.ts` (employer bulk CSV), `app/api/export/my-data/route.ts` (employee SAR)
- Billing routes: `app/api/billing/checkout/route.ts` (Stripe Checkout), `app/api/webhooks/stripe/route.ts` (webhook — excluded from auth middleware)
- Billing lib: `lib/billing.ts` (getBillingState, consumeOnboardingSlot)
- Stripe lib: `lib/stripe.ts` (getStripe singleton, getHirePricePence)
- CSV lib: `lib/csv.ts` (toCsv, csvRow, csvEscape, csvResponse)
- Rate limiting: `lib/rate-limit.ts` (in-memory; swap for Upstash Redis at scale)
- Security headers: inlined in `next.config.js` (CSP, HSTS, X-Frame-Options etc.)
- Legal pages: `app/legal/terms/page.tsx`, `app/legal/privacy/page.tsx`, `app/legal/dpa/page.tsx`
- Landing page: `app/page.tsx` (shows landing to unauthenticated users; redirects logged-in users to /dashboard)
- Export buttons: `components/ExportButtons.tsx` (EmployerExportButton, SarExportButton)
- Billing usage component: `components/BillingUsage.tsx`
- Password reset: `app/(auth)/forgot-password/` (page.tsx + actions.ts — `requestPasswordReset`, rate-limited 3/15min per email), `app/(auth)/reset-password/` (page.tsx server-side session guard + ResetPasswordForm.tsx + actions.ts — `updatePassword`), `app/auth/callback/route.ts` (exchanges the PKCE `code` from Supabase's emailed link for a session, then redirects to `next`). Shared by both employer and employee accounts (same `auth.users` table).
- Onboardings list (full, unpaginated): `app/(employer)/onboardings/page.tsx`; shared list UI extracted to `components/employer/OnboardingsList.tsx` (also used by the dashboard's capped-at-20 preview, which links to `/onboardings` once it hits that cap).
- Settings: `app/(employer)/settings/layout.tsx` (auth + tab nav via `SettingsTabs.tsx`) wrapping three tabs — `/settings` (General: `CompanyProfileForm.tsx` + `actions.ts` → `updateCompanyProfile`, edits `employer_accounts.company_name`/`company_number`), `/settings/team` (read-only `employer_members` list, no invite-teammate flow yet), `/settings/billing` (trial/credit summary + `BillingPortalButton.tsx` → `/api/billing/portal` → Stripe's hosted Billing Portal, get-or-create customer same as checkout). **Billing Portal requires activation in Stripe Dashboard → Settings → Billing → Customer portal** — until that's done, "Manage billing" will fail with a Stripe error (now surfaced properly, not a generic failure, but still needs that one-time dashboard step).

---

## Per-task notes (condensed)

- **1.5 invite flow:** validate → get employer_id via employer_members → duplicate guard → insert onboarding_instance → copy template_items → checklist_items → send email → audit_log. Invite URL: `{NEXT_PUBLIC_APP_URL}/join?token={invitation_token}`.
- **2.1 upload:** browser → Supabase Storage → recordDocumentUpload() → document_uploads row → checklist_items status='submitted'. document_uploads insert needs `document_name` (NOT NULL).
- **2.2 forms:** encrypt sensitive fields before write; form_field_key values 'ni_number'/'bank_details'/'emergency_contacts'.
- **2.3 policy:** acknowledgement writes checklist_items.status='submitted' + acknowledged_at, consent_records INSERT (granted), audit_log INSERT.
- **2.4 review:** view file via signed URL; one-click approve / re-upload with mandatory note; adminClient for checklist_items UPDATE.
- **3.1 portability:** matcher categorises fields universal/likely_stable/time_sensitive/employer_specific. Pre-population sets was_pre_populated=true, status='submitted'. Expired docs flagged + blocked.
- **3.2 consent:** first-time → `/consent`; returning with portable data → `/review`. Checklist page has server-side consent guard.
- **3.3 RTW:** RightToWorkUpload handles file upload and GOV.UK share codes (stored with `share_code:` prefix in file_path).
- **3.4 UI polish:** Tailwind JIT dynamic classes unreliable — use raw `<style>` tags for critical breakpoint logic. Two-step employer_accounts fetch required everywhere (no nested joins under RLS).
- **3.5 audit:** audit_action enum values must exist before insert. requestReupload was silently failing with missing enum value — fixed to `checklist_item_rejected`.
- **3.6 export:** employer bulk export at `/api/export/onboardings` (one row per checklist item); employee SAR at `/api/export/my-data` (sectioned CSV, decrypts NI/bank for data subject). Both audit-logged with `data_exported`. EmployerExportButton only renders when `total > 0`. SarExportButton on employee dashboard under "Your data" section.
- **4.1/4.2 billing:** Stripe Checkout creates session; webhook grants `paid_credits` on `checkout.session.completed` (idempotent via audit_log check on session id). `consume_onboarding_slot()` is atomic. BillingUsage component shows trial counter + buy button. **Billing gate is wired into `createInvitation`** (Aug 2026) — runs after the duplicate-invite check and before the onboarding instance is created, so a duplicate/invalid invite never consumes a slot. Returns `billingRequired: true` on exhaustion; InviteForm shows a "buy a credit" link.
- **4.3 legal:** Draft pages live. Placeholders `[DATE]`, `[LEGAL ENTITY NAME]`, `[NUMBER]`, `[ADDRESS]`, `[ICO NUMBER]`, `[EMAIL]`, `[PERIOD]` still need filling. Solicitor review required before launch.
- **4.4 security:** CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS headers in next.config.js. Rate-limit utility available at lib/rate-limit.ts — not yet applied to routes (recommended: login, checkout, export, invite). Full OWASP pass still TODO.
- **4.5 Sentry:** installed via `npx @sentry/wizard@latest -i nextjs`. Tracing and logs enabled. Add `SENTRY_AUTH_TOKEN` to Vercel environment variables for production source maps.
- **4.6 landing:** Live at root `/`. Hero uses live traffic-light checklist card as signature element. CTAs point to `/sign-up`. Log in link points to `/login`. Footer links to `/legal/terms`, `/legal/privacy`, `/legal/dpa`.

---

## Outstanding bugs / TODOs

### Before taking on real customers
- **Fill legal page placeholders** and get solicitor review (Terms, Privacy, DPA) — not code, needs your input
- **Add `SENTRY_AUTH_TOKEN` to Vercel env vars** — code side now fixed (Aug 2026): `next.config.js` was never actually wrapped with `withSentryConfig`, so the token had nowhere to be consumed and source maps were never uploading regardless of whether the env var existed. Now wired up (org `onboarding-platform`, project `onboarder`) and verified locally with a real production build. Token already exists locally in the gitignored `.env.sentry-build-plugin` / `.env.local` — same value just needs adding to Vercel, then redeploy.
- **Verify a real domain in Resend** and switch the invite email `from` address off `onboarding@resend.dev` (currently only reliably delivers to the account owner's own inbox, per Resend free-tier behaviour) — needs your Resend dashboard access
- **Stripe test-mode purchase CONFIRMED WORKING end-to-end (Aug 2026)** — checkout session → payment → webhook delivered → `paid_credits` incremented → dashboard reflects it. This was a long debugging session; see "Fixed (Aug 2026 — Stripe checkout debugging marathon)" below for everything that was actually broken and how it was found. **Still to do: switch Vercel's `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` back to the live values** (saved from earlier setup) and redeploy — currently still on test-mode credentials from this verification pass. **Security note:** the live secret key was accidentally pasted into chat during setup and was rotated in the Stripe dashboard afterward — confirm before relying on it that the key in place is the rotated one (check rotation history in Stripe's dashboard, not by comparing key text anywhere).
- **Automatic tax calculation (Stripe Tax / VAT) is deliberately DISABLED in the checkout route** (`automatic_tax` removed from `stripe.checkout.sessions.create()` in `app/api/billing/checkout/route.ts`) — it requires a saved address on the Stripe Customer object, which this app never collects, and two attempts to satisfy that requirement (`customer_update.address: 'auto'`, then also `billing_address_collection: 'required'`) did not resolve Stripe's upfront validation error on a pre-existing customer reference. Whether/how to charge VAT is a real business decision (registration status, thresholds) that needs deliberate handling, not something configured under time pressure — **revisit this intentionally before relying on it for real invoicing.**
- **Found mid-testing: `BillingUsage` component existed but was never rendered anywhere — fixed.** The trial-counter + "Buy onboarding credit" button (`components/BillingUsage.tsx`) was fully built with working logic, but no page ever imported or rendered it — there was no way to reach Stripe Checkout from the actual app UI at all, regardless of any Stripe account configuration. Wired into `app/(employer)/dashboard/page.tsx` (fetches `getBillingState(employerId)`, renders above the stat cards, visible regardless of onboarding count so a 0-onboarding employer still sees their trial status).
- **Found mid-testing: Vercel Deployment Protection was enabled on the project**, putting the entire live site behind a Vercel-account login wall. Invisible during normal testing because the browser was already authenticated to Vercel (silently passed through); surfaced only when testing in incognito, which hit Vercel's login page instead of the app. **This would also have silently blocked every Stripe webhook delivery** (an unauthenticated server-to-server request, same as incognito) — meaning no credit would ever have been granted for a real customer purchase, with no obvious error anywhere. Disabled in Settings → Deployment Protection. Worth an occasional spot-check that this hasn't been re-enabled.
- **Set up custom SMTP for Supabase Auth emails** (Project Settings → Auth → SMTP Settings) before relying on password reset / signup confirmation for real customers — Supabase's default mailer is low-volume. Resend SMTP creds work here too (`smtp.resend.com`, same `RESEND_API_KEY`) — same domain-verification dependency as the point above.
- **Found via manual testing: `SidebarNav.tsx`'s "Onboardings" and "Settings" nav items 404'd** — both `href`s (`/onboardings`, `/settings`) pointed at routes that were never built. `/templates` (the third nav item) was already fine. Built both: `/onboardings` (full unpaginated list, dashboard's 20-item preview now links to it once capped), and `/settings` with three tabs (General/Team/Billing — see file/route map above). **Billing Portal needs one-time activation in Stripe Dashboard → Settings → Billing → Customer portal** before "Manage billing" will actually work.
- **Deferred from security session:** service-role key rotation + commit/push
- **Deferred from security session:** smoke test 2 (consent withdrawal blocking employer access)
- ~~Add `/auth/callback` to Supabase's Redirect URLs allow-list~~ — done and confirmed working end-to-end (Aug 2026 manual test).

### Fixed (Aug 2026 — Stripe checkout debugging marathon)
Chased "could not check out / please check your connection" through several
layers before it actually worked. In order of discovery:
1. `/api/billing/checkout` had **no error handling at all** around any Stripe API call — any failure crashed the route into a non-JSON 500, which the client's `res.json()` couldn't parse, surfacing as a generic connection error with zero diagnostic value. Added try/catch, returns the real Stripe error as JSON (`param` included when Stripe provides one).
2. Root cause #1: **`NEXT_PUBLIC_APP_URL` had a stray leading space** in Vercel's env vars (invisible in the dashboard UI, likely a copy-paste artifact), making the computed `success_url` start with a space — Stripe rejected it as `url_invalid` with a message that gave no hint it was whitespace. Fixed the value in Vercel (retyped from scratch) and added `.trim()` in the route as a permanent safeguard.
3. Root cause #2: **`automatic_tax` requires an address already saved on the Stripe Customer object**, which this app's `stripe.customers.create()` call never sets (email/name/metadata only). Two attempts to satisfy this via `customer_update.address: 'auto'` and `billing_address_collection: 'required'` did not resolve Stripe's upfront validation on a pre-existing customer reference. Resolved by disabling `automatic_tax` entirely for now — see the "before taking on real customers" note above about revisiting VAT deliberately.
4. Root cause #3, found only via testing in incognito: **Vercel Deployment Protection was enabled**, putting the whole production site behind a Vercel-account login wall. Silent in normal browser testing (already Vercel-authenticated), but would have blocked every Stripe webhook delivery the same way it blocked incognito access — meaning no real customer purchase would ever have granted a credit, with no visible error anywhere. Disabled in Settings → Deployment Protection.
5. Repeatedly lost time to **stale Vercel deployments being tested against** — pushing a fix and retrying immediately, before the new deployment fully promoted to Production, kept showing old behaviour that looked like the fix hadn't worked. Always confirm the top Deployments-tab entry's commit hash matches the latest push and shows "Ready" before concluding a fix didn't work.
6. Along the way, created a disposable test employer account (`test-employer@onboardiq.test` / `TestPass123!`, company "Test Company Ltd") via a one-off script mirroring `lib/actions/auth.ts`'s real `signUp()` logic, because the account being used for testing turned out to have an orphaned `auth.users` row with no linked `employer_members`/`employer_accounts` rows (signed up outside the app's normal flow at some point). Its `onboardings_used` was also bumped to 3 directly via script to skip past the free trial for testing purposes. All diagnostic/setup scripts were scratch files, deleted after use — nothing left in the repo.
Confirmed working end-to-end afterward: checkout → test card payment → webhook delivered → `paid_credits` incremented → dashboard reflects it.

### Built (Aug 2026 — password reset flow)
- **Full forgot-password / reset-password flow**, previously just a 404'ing link. `/forgot-password` (request email, rate-limited 3 per email per 15 min via existing `lib/rate-limit.ts`), `/auth/callback` (exchanges Supabase's PKCE code for a session), `/reset-password` (session-gated — shows "link expired" + a link back to `/forgot-password` if no valid recovery session, otherwise the set-new-password form). Uses `supabase.auth.resetPasswordForEmail()` / `updateUser({ password })` — no new DB tables or app-side email templates needed, Supabase handles delivery itself.
- Shared across both employer and employee logins (single `auth.users` table) — no role-specific branching needed.
- Known rough edge, inherent to Supabase's PKCE email-link flow, not fixable from our side: if the reset link is opened in a **different browser/device** than the one that requested it, the code exchange fails (the PKCE verifier is a cookie scoped to the requesting browser). Handled gracefully — `/auth/callback` redirects to `/forgot-password?error=link_expired` with an explanatory banner rather than crashing — but the user does need to open the link where they requested it.
- **Local testing note:** `NEXT_PUBLIC_APP_URL` in `.env.local` is set to the production URL (same as the existing invite-email pattern), so a reset requested from `localhost:3000` will generate a link pointing at production. To test the full click-through loop locally, temporarily set `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env.local` (and make sure that URL is in Supabase's redirect allow-list too).
- Verified: `tsc --noEmit` and `npm run build` pass; live-server curl confirms `/forgot-password` and `/reset-password` both render (200) for anonymous users, and `/auth/callback` with no code correctly redirects to `/forgot-password?error=link_expired`. Did **not** trigger a real reset email end-to-end during testing, to avoid emailing a real account — that part needs your manual pass.
- **CONFIRMED WORKING end-to-end** (manual test, Aug 2026): request → email → click → set new password → sign in with it. Full loop verified against the real Supabase project.
- **Gotcha found during manual testing — Supabase Redirect URLs are exact-match, not prefix-match, when the allow-list entry has no wildcard.** `resetPasswordForEmail`'s `redirectTo` originally carried `?next=/reset-password`; since the registered entries (`.../auth/callback`, both localhost and prod) have no `**` wildcard, GoTrue rejected the mismatch and **silently fell back to Site URL** instead of erroring — the email link landed on the bare production homepage with only `?code=...` attached, no indication anything was wrong. Fixed by dropping the query string from `redirectTo` entirely; `/auth/callback` now defaults `next` to `/reset-password` on its own. If `/auth/callback` ever needs to serve more than one destination in future, either register wildcard entries (`.../auth/callback**`) or keep using exact-match entries per destination — don't assume appending a query string to an allow-listed base URL will pass validation.
- Also found during this test pass: the project's Supabase **Redirect URLs list initially had the production entry split into two broken partial-string rows** (a copy-paste artifact) — worth spot-checking if any other redirect-URL issues crop up later.

### Fixed (Aug 2026 session)
- **Billing gate wired into invite flow** — `createInvitation` now calls `consumeOnboardingSlot(employerId)` before creating the onboarding instance; returns `billingRequired: true` and the invite form shows a "buy a credit" link when the employer is out of free onboardings and paid credits.
- **`/api/webhooks/stripe` excluded from auth middleware matcher** — Stripe's unauthenticated POST was previously being redirected to `/login`, which would have silently broken the webhook and blocked all credit grants. Matcher now excludes `api/webhooks` alongside `api/cron`.
- **Broken employee-login redirect fixed in 6 files** — `app/(employee)/layout.tsx`, `EmployeeNav.tsx`, employee dashboard/consents/consent-gate/checklist pages all redirected to `/auth/employee-login`, which is not a real route (404). Corrected to `/employee-login`, the actual page path (the `(auth)` route group is invisible in the URL — this was previously fixed once per the archived context notes, then regressed).
- **Consent gate bypass closed** — the checklist item page (`item/[itemId]/page.tsx`) now runs the same server-side consent check as the checklist page before rendering the form/upload, redirecting to `/consent` if the required category isn't granted.
- **`document_uploads.verification_status` now synced** — `approveChecklistItem` sets it to `'verified'`; `requestReupload` sets it to `'rejected'` (fetches the pre-update `document_upload_id` since Supabase's post-update `.select()` would otherwise return the just-cleared value).
- **`audit_log.actor_id` inconsistency fixed** — `grantConsent`/`withdrawConsent` in `lib/consent.ts` now take an explicit `actorUserId` param and log the auth user id, matching every other audit_log call site. Callers in `app/(employee)/employee/onboarding/[id]/consent/actions.ts` updated to pass `user.id`.
- **Nav link to `/employee/consents`** added to `EmployeeNav.tsx` ("Your consents").
- **Migration file renamed** `001_initial_schema.sql.sql` → `001_initial_schema.sql` (git mv; was not referenced by any code, only docs).
- Verified `npx tsc --noEmit` and `npm run build` both pass after these changes.

### Fixed (Aug 2026 test pass — found by booting dev server + curling every route)
- **Legal pages were gated behind login** — `PUBLIC_ROUTES` in `middleware.ts` listed `/privacy` and `/terms`, but the real pages live at `/legal/privacy`, `/legal/terms`, `/legal/dpa`. Anonymous visitors clicking the landing-page footer got redirected to `/login` instead of seeing the policy pages. Replaced the two stale entries with a single `/legal` prefix match.
- **Sign-up page's Terms/Privacy links 404'd** — `app/(auth)/sign-up/page.tsx` linked to bare `/terms` and `/privacy`, which don't exist as routes. Fixed to `/legal/terms` / `/legal/privacy`.
- **`employee-login` actions redirected to `/auth/login`** (404, not a real route) when the signup/login form was submitted without an invite token in the URL — reachable by navigating to `/employee-login` directly. Was wrapped in `as any` to silence the typed-routes error rather than fixing the path — fixed to `/login` and cast removed. `app/(auth)/employee-login/actions.ts`.
- **Item page's own auth guard sent expired/logged-out employees to `/login` (employer login)** instead of `/employee-login`, inconsistent with every other employee page. Pre-existing, not something introduced this session. Fixed in `item/[itemId]/page.tsx`.
- Verified via live dev-server curl: legal pages now 200 for anonymous users, `/api/webhooks/stripe` now reaches its own handler instead of being redirected to `/login` (confirms the middleware matcher fix works), protected routes still correctly 307 to login.

### Fixed (Aug 2026 session — session routing / RTW / returning-employee login / tests)
- ~~Session routing bug~~ — investigated via code review (not live multi-session browser testing): `app/join/page.tsx` already checks `employer_members` before ever calling `acceptInvitation()` and shows a dedicated "You are signed in as an employer" explanation screen instead of misrouting, with `acceptInvitation()` itself rejecting employer sessions as defence in depth. The code comments explicitly reference this as the fix for "invite links landing on the wrong dashboard." Same pattern as the earlier stale-bug find (acceptInvitation/employer_members) — this was already fixed in a prior session and the CONTEXT.md note was stale, not a live bug. No change made. If you still see this happen, it's a NEW regression, not the original issue — tell me exactly what URL you land on.
- **GOV.UK share code display was broken for employers — now fixed.** `getSignedDocumentUrl` unconditionally called Supabase Storage's `createSignedUrl()` on `document_uploads.file_path`, but a share-code submission stores the literal string `share_code:XXXXXXXXX` there (not a real file) — that call always failed, so clicking "Review" on a share-code RTW submission showed a generic "Could not generate document link" error instead of the code. Fixed: `getSignedDocumentUrl` now detects the `share_code:` prefix and returns the code directly; `OnboardingDetailView.tsx` renders it with a "Verify at gov.uk/view-right-to-work" link, mirroring the employee's own read-only view. `app/(employer)/dashboard/onboarding/[id]/actions.ts`, `components/employer/OnboardingDetailView.tsx`.
- **Related gap found, not fixed (separate from share codes specifically):** once ANY right-to-work item (file or share code) is submitted but not yet approved, revisiting the item page shows the blank `RightToWorkUpload` form again rather than a "submitted, pending review" state — unlike the generic `DocumentUpload` component, which does show existing-submission state via an `existingUpload` prop. `RightToWorkUpload` has no equivalent prop. Not share-code-specific (equally affects the already-working file/passport path), so left alone this session — would need `RightToWorkUpload` to accept and render existing submission state.
- **Returning employees can now log in directly — `/employee-login` no longer requires a token.** `loginEmployee` (not `signUpEmployee` — signup stays invite-gated, there's nothing for a fresh account to attach to without one) now works with no token, redirecting to `/employee/dashboard` instead of `/join?token=...`. The page defaults to login mode (not signup) when no token is present, and hides the signup toggle in that case with an explanatory note instead of a dead-end redirect. Added a reciprocal "Sign in here instead" link from the employer `/login` page for discoverability, since there was previously no way to find `/employee-login` without already having an invite link. `app/(auth)/employee-login/actions.ts`, `app/(auth)/employee-login/page.tsx`, `app/(auth)/login/page.tsx`.
- **Automated test suite added.** Vitest (`npm test` / `npm test:watch`), config at `vitest.config.mts`. 38 unit tests across 4 files, all pure-logic modules with no live Supabase/DB dependency: `lib/portability/profile-matcher.test.ts` (the richest — covers the core portable-profile matching logic: NI/bank/emergency-contact matching, RTW document expiry handling, employer-specific categories never being portable, most-recent-document selection, aggregate grouping), `lib/rate-limit.test.ts` (bucket allow/deny, per-key isolation, window reset, using `vi.useFakeTimers()`), `lib/csv.test.ts`, `lib/encryption.test.ts` (round-trip, tamper detection via GCM auth tag, malformed-input handling — uses a hardcoded dummy 64-hex test key, unrelated to the real `ENCRYPTION_KEY`). Does NOT cover anything that needs a live Supabase connection (billing, consent, most server actions) — that would need integration/e2e tooling (e.g. Playwright against a test DB), which is a separate, bigger effort not attempted here.
- Found while installing Vitest: `npm install` currently reports 11 pre-existing vulnerabilities (1 moderate, 10 high) — all transitive deps of `next`, `eslint-config-next`, `@sentry/bundler-plugin-core` (brace-expansion, fast-uri, glob, js-yaml, postcss, qs, sharp, ws), none introduced by Vitest. Did **not** run `npm audit fix --force` since it wants to bump `next`/`eslint-config-next` versions — risky to do silently given how much Next-16/Turbopack-specific behaviour this project already works around. Worth a dedicated dependency-upgrade pass later, done deliberately with full regression testing, not as a drive-by fix.

### Known bugs (not blocking launch)
- **Minor:** Next.js 16 middleware deprecation warning (middleware.ts → proxy.ts rename) — cosmetic, still works
- **Minor:** two `002_` numbered migration files (`002_export_and_billing.sql`, `002_status_engine.sql`) — not a current problem since both have run, but worth renumbering if a fresh-DB setup script ever depends on lexical ordering.

---

## Notes / things to remember

- Security hardening pass (Jul 2026): fixed cross-tenant document/checklist access, consent gates employer access to NI/bank details, invitation accept flow derives identity from session not params. Full detail in `Docs/security-fixes-2026-07-03.md`.
- Any new adminClient usage MUST verify caller identity + resource ownership in code before the query — RLS is bypassed entirely.
- Encryption key env var is `ENCRYPTION_KEY` (not FIELD_ENCRYPTION_KEY — that was a dead/unused module, now deleted).
- Platform is fully deployed and functional as of Jul 2026. All phases 1–4 complete. As of Aug 2026, the Stripe billing gate is live in the invite flow (no longer BACS-only) and the Stripe webhook auth-middleware bug is fixed — real credit purchases should now work end-to-end. Still needs: legal page content, SENTRY_AUTH_TOKEN in Vercel, service-role key rotation.

---

## How to use this file

1. Start every Claude conversation by pasting this whole file before your task prompt.
2. Update after each task — tick tasks, add condensed notes, log new bugs.
3. Opus tasks: 1.2, 2.2, 3.1, 3.2, 4.4 — fresh conversation, paste context first.
4. Don't skip ahead — each phase builds on the previous one.
