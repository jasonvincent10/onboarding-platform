# Workforce compliance tracking: design and operating notes

Built September 2026. This documents the model, the decisions behind it,
and what an operator needs to know. Code is the source of truth for detail.

## What it does

An employer loads their workforce (automatically from completed onboardings,
or by CSV / manual add), ticks the requirements their people must hold
(training, licences, checks, registrations, medicals, screening, HR events),
and Vopria works out what is due when. Evidence is stored, employee uploads
are reviewed, reminders go out before expiry, work-blocking lapses are
escalated immediately, and everything exports to CSV for auditors or other
systems.

## Data model (migration 009)

| Table | Purpose |
|---|---|
| `employments` | The workforce. One row per person per employer. `employee_id` is NULL until they claim an account via `/workforce-invite`. Auto-created by trigger when an onboarding reaches `complete`. |
| `compliance_requirement_types` | The library. System rows have `employer_id NULL` and a stable `code`; employers can add custom rows. ~90 seeded across care, construction, hospitality, logistics, security, cross-sector and organisation-level. |
| `employer_requirements` | Which types this employer enforces: enabled flag, interval override (only honoured when the type is not `interval_locked`), reminder lead days, applies-to all or role groups. |
| `role_groups` + join tables | "Drivers", "Kitchen", "Door team". Requirements can be scoped to groups; people can belong to several. |
| `compliance_records` | One row per person (or organisation) per requirement per cycle. Renewing inserts a new current row and points the old one at it via `superseded_by`, so history is kept. |
| `compliance_hours_log` | Driver CPC periodic-training hours against a record. |
| `compliance_notifications_sent` | Dedupe for the daily sweep. |

### Renewal rules (`lib/compliance/engine.ts`)

| Rule | Next due date | Examples |
|---|---|---|
| `fixed_interval` | issue date + interval, interval locked | CSCS 5y, DCPC 5y, SIA 3y, FAW 3y |
| `employer_interval` | issue date + interval, employer may override | food hygiene 3y, FLT 3y, DBS recheck 3y |
| `document_date` | date printed on the document | visa, BRP, NMC revalidation, Scottish personal licence |
| `no_expiry` | never | Care Certificate, personal licence (E&W), H&S induction |
| `age_based` | driver medical: 45th birthday, then 5-yearly capped at 65, then annual | D4 medical |
| `status_check` | last check + interval | DBS Update Service, DVLA licence check |
| `event_based` | the entered end date | site induction tied to a project |

Status is never stored. It is derived from `expires_at` and the requirement's
largest lead day: `missing`, `awaiting_review`, `rejected`, `valid`,
`expiring`, `expired`, `exempt`. Types carry a `work_blocking` flag so the
dashboard separates "cannot legally work" from "refresher overdue".

### Access and data protection

Compliance records are employer-controlled data (the employer must hold
training and licence records by law), not part of the employee's portable
profile. They live under `employer_id`, in their own private bucket
`compliance-evidence`, and are NOT gated by `consent_records`. The lawful
basis is legal obligation / legitimate interest. Employees see and upload
their own records; employer uploads are verified immediately, employee
uploads start `pending`.

All evidence access goes through signed URLs minted server-side after an
ownership check, so the bucket has no storage RLS policies. Reference
numbers (card, licence, certificate numbers) are AES-256-GCM encrypted with
the existing `_encrypted` convention.

## Plans (migrations 010 and 011, `lib/plans.ts`)

Two products on one size axis. The customer picks Onboarding, Compliance or
both, then says how many people work for them. Monthly prices:

| People | Onboarding | Compliance | Complete | Saving |
|---|---|---|---|---|
| Up to 25 | £49 | £79 | £99 | £29 (23%) |
| 26 to 50 | £79 | £139 | £169 | £49 (22%) |
| 51 to 100 | £109 | £229 | £269 | £69 (20%) |
| 101 to 200 | £149 | £349 | £399 | £99 (20%) |

Free sits underneath (3 onboardings, no card) and Custom above (over 200 or
bespoke, set by hand with no Stripe gate). Annual billing charges ten months,
so two are free. A first paid subscription of any tier gets a 14-day no-card
trial.

Why this shape rather than ascending tiers: the previous free/onboard/comply
model priced onboarding flat and compliance by headcount, so customers had to
learn two units to compare three cards; "comply" silently contained
"onboard"; and anyone wanting compliance alone had to buy onboarding too.

Headcount is measured as active employments and enforced only when the plan
includes compliance, since nothing else counts against it. `subscription_status`
carries Stripe's state (`trialing | active | past_due | cancelled | unpaid`);
`trial` remains the free-tier default. `plan_has_unlimited_onboarding()` in
SQL and `entitlementsFor()` in TS must stay in step, and note that the
compliance-only tier does NOT grant unlimited onboarding.

VAT is still an open decision: prices display "ex VAT" and Stripe Tax is off.

## Where onboarding feeds compliance (migration 012)

A template item can name the compliance requirement it satisfies. That choice
is copied onto the checklist item when an onboarding is created, the same way
`item_name` is, so editing a template never rewrites an onboarding already in
flight. When the employer approves the item,
`lib/compliance/onboarding-sync.ts` creates the compliance record.

The employment row only exists once the onboarding reaches `complete`, so the
sync no-ops until then and does its work on the approval that completes the
onboarding. It is safe to call on every approval and safe to repeat: anything
already tracked is left alone, so a renewal recorded later is never overwritten
by re-approving the original item.

**Dates are the subtle part.** Onboarding collects a document, not a renewal
schedule. An expiry the employee copied off the document is trusted, whatever
the rule says, because it is the best fact available. Otherwise the record is
created as `pending` with a note asking for the missing date, and it surfaces
in the action queue. We deliberately do not infer an issue date from the
approval date: a CSCS card approved today might expire next month, and showing
five years of false validity is worse than asking. `decideRecordDates()` is
pure and unit-tested for exactly this.

One known gap: the evidence file itself is not copied from the
`employee-documents` bucket into `compliance-evidence`. The record notes
which onboarding it came from, and the employer attaches evidence properly when
they confirm the dates. Worth revisiting if people find the double handling
annoying.

## Daily sweep

`lib/compliance/sweep.ts`, called from `/api/cron/check-overdue` (Vercel free
tier allows two crons, both used). For every employer whose plan includes
compliance:

1. Employee reminders at each lead day (default 90/30/7), once per record
   per lead, plus one nudge on expiry and one for missing/rejected items.
2. Immediate escalation to all employer members when a work-blocking item
   expires.
3. Monday digest to employer members: expired, missing, expiring within 30
   days, count awaiting review.

## Routes

| Route | Purpose |
|---|---|
| `/workforce`, `/workforce/[id]` | employer: people list, person page with records |
| `/compliance` | employer: stat cards, action queue, matrix, organisation items |
| `/compliance/settings` | employer: tick requirements, sector quick-start, role groups, custom types |
| `/employee/compliance` | employee self-service |
| `/workforce-invite?token=` | public: claim a workforce record (mirrors `/team-invite`) |
| `/api/export/compliance` | CSV; `?verifiedOnly=1` for clean handover, `?employmentId=` for one person |
| `/api/billing/subscribe` | Stripe subscription checkout or in-place plan change |
| `components/pricing/PlanChooser.tsx` | the module + size chooser, shared by the pricing page and Settings, Billing |

## Operating checklist

1. Run `Supabase/Migrations/009_workforce_compliance.sql`, then
   `010_subscriptions.sql`, `011_plan_modules.sql` and
   `012_onboarding_compliance_link.sql` in the SQL editor.
   All are re-runnable. Confirm each landed with a catalog query rather than
   assuming: the editor runs a script in one transaction and a mid-script
   error rolls everything back without an obvious signal.
2. In Stripe: add webhook events `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid`, `invoice.payment_failed` alongside
   `checkout.session.completed`. Enable the Customer Portal with plan
   cancellation allowed.
3. Prices are inline `price_data`; nothing to create in the Stripe
   dashboard. Change numbers only in `lib/plans.ts`.
4. Set an employer to `plan_tier = 'custom'` by hand for negotiated deals.
5. Legal pages (privacy, DPA) need a paragraph on compliance records:
   employer as controller, legal obligation / legitimate interest as basis.

## Not built yet

- Copying onboarding evidence files into the compliance evidence bucket.
- Asset-level items (vehicle MOT, tachograph calibration, LOLER).
- Line-manager permissions and multi-site.
- Course-provider integrations.
