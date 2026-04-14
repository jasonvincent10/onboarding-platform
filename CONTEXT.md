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
| Frontend | Next.js 14+ App Router |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes + Server Actions |
| Database | Supabase (PostgreSQL) — EU region |
| Auth | Supabase Auth (email/password + magic links) |
| File storage | Supabase Storage |
| Email | Resend |
| Hosting | Vercel |
| Payments | Stripe (per-hire billing) |

---

## Database schema

### Tables
- [x] `employer_accounts` — id, company_name, company_number, stripe_customer_id, subscription_status, onboardings_used
- [x] `employer_members` — id, employer_id → employer_accounts, user_id → auth.users, role, full_name, email
- [x] `employee_profiles` — id, user_id → auth.users, full_name, email, DOB, address, phone, ni_number_encrypted, bank_sort_code_encrypted, bank_account_number_encrypted, emergency_contacts (JSONB), right_to_work_status, right_to_work_expiry
- [x] `onboarding_templates` — id, employer_id, template_name, role_type, is_default
- [x] `template_items` — id, template_id, item_name, description, item_type (enum), data_category (enum), form_field_key, sort_order, deadline_days_before_start
- [x] `onboarding_instances` — id, employer_id, employee_id, template_id, invitee_name, invitee_email, role_title, start_date, invitation_token, status, readiness_pct
- [x] `checklist_items` — id, onboarding_id, template_item_id, item_name, item_type, data_category, status (enum), deadline, document_upload_id, acknowledged_at, reviewed_by, reviewer_notes, was_pre_populated
- [x] `document_uploads` — id, employee_id, document_type, file_path, data_category, verification_status, expiry_date
- [x] `consent_records` — id, employee_id, employer_id, data_category, action (granted/withdrawn), onboarding_id. APPEND-ONLY.
- [x] `audit_log` — id, actor_id, actor_type, action (enum), resource_type, resource_id, employer_id, employee_id, metadata (JSONB). APPEND-ONLY.

### Key architectural decisions
- Documents attach to **employee profile**, not onboarding instance (portability)
- Template items are COPIED into checklist_items when onboarding is created (templates can change without affecting active onboardings)
- Sensitive fields use `_encrypted` suffix — AES-256 encrypted at app level before DB write
- Consent is append-only (grant/withdraw creates new rows, latest row wins)
- `data_category` enum links template items → documents → consent (drives granular sharing)
- `employer_members` join table supports future multi-user per org

### RLS policies
- All 10 tables have RLS enabled
- Helper functions: `get_my_employer_id()`, `get_my_employee_id()`, `has_active_consent()`
- Employers see only their own org data
- Employees see only their own profile/documents/onboardings
- Employer access to documents requires BOTH active onboarding + active consent for that data_category
- consent_records and audit_log: INSERT + SELECT only (no UPDATE/DELETE)

### Utility functions
- `create_default_template(employer_id)` — creates Standard UK Onboarding template with 8 items on signup
- `create_onboarding_from_template(...)` — copies template items into checklist_items with calculated deadlines

---

## Environment variables

> Fill these in after Task 1.1 (project setup).

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
```

---

## Key decisions made

| Decision | Choice | Reason |
|---|---|---|
| Document ownership | Attached to employee profile | Enables portability across employers |
| Auth provider | Supabase Auth | Built-in, no separate service needed |
| File storage | Supabase Storage with RLS | Employees can only access their own files |
| Sensitive field encryption | AES-256 field-level before storage | Defence in depth on top of Supabase at-rest encryption |
| Billing model | Per-hire via Stripe Checkout | First 3 onboardings free, then paid |
| Mobile strategy | Responsive web only | No native app for MVP |
| Right to work | Guidance + manual check only | No GOV.UK API integration yet |
| E-signatures | Link to DocuSign/Adobe Sign | Complex legal territory, out of MVP scope |

---

## Current build status
### Task 3.2 — Consent management (shipped)

- SQL migration `003_consent_helpers.sql` applied: function `get_consent_status_for_employer(employee_id, employer_id)` returns latest action per category; index `idx_consent_records_lookup` supports it.
- Service layer in `lib/consent.ts` — single source of truth for consent operations. Exports `DATA_CATEGORIES`, `CATEGORY_INFO`, `getRequiredCategories`, `getConsentStatus`, `hasActiveConsent`, `grantConsent`, `withdrawConsent`. All writes use adminClient.
- First-time accepters redirect to `/employee/onboarding/[id]/consent` (explicit opt-in for every data category required by the onboarding). Returning employees with portable data still go to `/review` — consent integration into `/review` NOT YET BUILT.
- Checklist page has a safety-net guard: refuses to render unless every required category has an active granted consent, otherwise redirects back to `/consent`.
- Standing management page at `/employee/consents` lists every employer the employee has shared data with, shows granted/withdrawn state per category, allows withdrawal with confirm dialog.
- Withdrawals are append-only INSERTs of `action = 'withdrawn'`. Original granted rows preserved. GDPR audit trail intact.

> Tick off tasks as you complete them and note anything important.

### Phase 1 — Foundation (Weeks 1–3)
- [x] **1.1** Project setup *(Sonnet)*
- [x] **1.2** Database schema design *(Opus)*
- [x] **1.3** Employer auth + empty dashboard *(Sonnet)*
- [x] **1.4** Onboarding template builder *(Sonnet)*
- [x] **1.5** Employee invitation flow *(Sonnet)*
- [x] **1.6** Employee portal / checklist view *(Sonnet)*

### Phase 2 — Core Functionality (Weeks 4–6)
- [x] **2.1** Document upload system *(Sonnet)*
- [x] **2.2** Form-based data entry — NI, bank, emergency contacts *(Opus)*
- [x] **2.3** Policy acknowledgement *(Sonnet)*
- [x] **2.4** Employer review workflow *(Sonnet)*
- [x] **2.5** Status engine *(Sonnet)*
- [x] **2.6** Automated email reminders *(Sonnet)*

### Phase 3 — Portability & Polish (Weeks 7–9)
- [x] **3.1** Portable profile logic *(Opus)*
- [x] **3.2** Consent management *(Opus)*
- [ ] **3.3** Right to work guidance *(Sonnet)*
- [ ] **3.4** UI polish + responsive design *(Sonnet)*
- [ ] **3.5** Audit trail *(Sonnet)*
- [ ] **3.6** Data export CSV *(Sonnet)*

### Phase 4 — Billing & Launch (Weeks 10–12)
- [ ] **4.1** Stripe integration *(Sonnet)*
- [ ] **4.2** Free trial / pilot mode *(Sonnet)*
- [ ] **4.3** Legal pages — use Sonnet to draft, solicitor to review
- [ ] **4.4** Security hardening *(Opus)*
- [ ] **4.5** Error tracking + monitoring *(Sonnet)*
- [ ] **4.6** Landing page + sign-up funnel *(Sonnet)*

---

## Notes / things to remember

- Next.js 16 requires `await createClient()` everywhere — apply to every new
  file that calls createClient()
- Service role client (createAdminClient) needed in auth.ts to bypass RLS
  on sign-up writes
- middleware.ts is now called proxy.ts in Next.js 16 — rename before launch
- Task 1.3 bug FIXED: sign-up action now inserts employer_accounts + employer_members
  rows using adminClient (service role) after auth.signUp(). Also calls
  create_default_template() RPC. See TASK-1.3-BUG-FIX.ts for the full replacement
  signUpEmployer() function.
- Task 1.5 patterns established:
  - Invite flow: page.tsx (server, loads templates) + InviteForm.tsx (client)
    + actions.ts (server action)
  - Server action pattern: validate → get employer_id via employer_members → check
    duplicates → insert onboarding_instance → copy template_items to checklist_items
    with deadline calculation → send email → write audit_log
  - Checklist deadline formula: start_date minus deadline_days_before_start days
  - Invite URL format: {NEXT_PUBLIC_APP_URL}/join?token={invitation_token}
  - Resend from address: use 'onboarding@resend.dev' for dev/testing; replace with
    verified domain before launch
  - Duplicate guard: check onboarding_instances for same employer_id + invitee_email
    + status IN ('pending', 'in_progress') before inserting
  - Email failure is non-fatal: onboarding_instance still exists, employer can copy
    the invite link manually from the dashboard
  - lib/email/invite-template.ts — reusable HTML email builder, safe() helper
    escapes user input to prevent injection
- Task 1.6 patterns established:
  - Employee URL structure: /employee/dashboard, /employee/onboarding/[id]
  - Route group (employee) at app/(employee)/ wraps all employee routes with auth guard
  - Join flow: /join?token=xxx → validates token → auth if needed → accept_invitation action → redirect to checklist
  - acceptInvitation() in app/join/actions.ts: creates employee_profile if first time, links onboarding_instance, writes audit_log
  - ChecklistView.tsx sorts items: overdue → not_started → in_progress → submitted → approved
  - CTA links point to /employee/onboarding/[onboardingId]/item/[itemId] — these will be wired in Task 2.1/2.2/2.3
  - was_pre_populated flag shows "From profile" badge — will be set by Task 3.1 portable profile logic

- Had to run GRANT ALL ON ALL TABLES after schema reset
- GRANT SELECT ON auth.users TO authenticated + service_role required for invite flow
- Resend free tier only delivers to verified email address during development
- Email confirmation must be OFF in Supabase Auth settings
- Task 2.1 patterns established:
  - Storage bucket: employee-documents (private, 10MB, PDF/JPG/PNG)
  - File path convention: {user_id}/{document_type_slug}_{timestamp}.{ext}
  - Storage RLS: employees upload/read/delete only their own {userId}/ folder
  - Employers access documents via server-generated signed URLs (service role bypasses RLS)
  - Upload flow: browser → Supabase Storage → recordDocumentUpload() server action → document_uploads row → checklist_items updated to 'submitted'
  - Documents always attach to employee_profile (not onboarding) — portability preserved
  - Expiry date captured for right_to_work / passport / BRP / visa items
  - Item page at app/(employee)/employee/onboarding/[id]/item/[itemId]/page.tsx
  - DocumentUpload component at components/upload/DocumentUpload.tsx
- Task 3.4 TODO: Add standalone employee sign-in page at /auth/employee-login 
  that redirects to /employee/dashboard when no token is present (for returning 
  employees who want to check progress without re-using invite link)
- Task 2.1 complete. Bugs fixed during testing:
  - Missing lib/supabase/admin.ts — created with createAdminClient() using service role key
  - Employee login was routing to employer login page — created dedicated
    app/auth/employee-login/page.tsx and actions.ts that preserve the invite
    token and redirect back to /join?token=... after auth
  - acceptInvitation() in app/join/actions.ts — fixed brace structure and moved
    onboarding query before profile creation so invitee_name is available
  - document_uploads insert was missing document_name field — added to insert
  - checklist_items has no FK to document_uploads — split getChecklistItem()
    into two separate queries instead of a join
  - TYPE_CONFIG in ChecklistView.tsx doesn't include 'form_entry' — added
    fallback ?? { label: item.item_type, icon: null } to avoid crash
  - Checklist CTA button was invisible — Tailwind classes not applying, fixed
    with inline style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}
  - Task 3.4 TODO: Add standalone employee sign-in page at /auth/employee-login
    that redirects to /employee/dashboard when no token is present

   - Task 2.2 patterns established:
  - Encryption utility at lib/encryption.ts — AES-256-GCM, server-side only
  - Storage format: iv.authTag.ciphertext (dot-separated base64 in TEXT columns)
  - Env var is ENCRYPTION_KEY (64-char hex string, 32 bytes)
  - Validation at lib/validation/ — ni-number.ts, bank-details.ts, emergency-contacts.ts
  - Server actions at lib/actions/form-actions.ts — validate → encrypt → update profile → update checklist status → audit log
  - Form components at components/forms/ — NINumberForm, BankDetailsForm, EmergencyContactsForm
  - FormEntryHandler routes to correct form based on checklist item's form_field_key
  - form_field_key values: 'ni_number', 'bank_details', 'emergency_contacts'
  - NI validation follows HMRC rules (prefix/suffix letter restrictions)
  - Bank validation is format-only for MVP — full Vocalink modulus check deferred to Task 4.4
  - Emergency contacts stored as JSONB (not encrypted), max 3 contacts
  - bank_account_holder_name column added to employee_profiles (not encrypted)
  - getExistingProfileData() server action decrypts profile data for form pre-fill
  - Historical checklist_items created before form_field_key existed had NULL values — patched directly
  - Task 2.4 will need decryption to show employer the submitted data (with consent check) 
- Task 2.3 patterns established:
  - PolicyAcknowledgement component at components/forms/PolicyAcknowledgement.tsx
  - acknowledgePolicy() server action at lib/actions/policy-actions.ts
  - Acknowledgement writes: checklist_items.status='submitted' + acknowledged_at,
    consent_records INSERT (action='granted'), audit_log INSERT
  - Policy content from checklist_items.description (text) or policy_document_path (PDF signed URL)
  - description and policy_document_path added to checklist_items and template_items via SQL migration
  - create_onboarding_from_template updated to copy both new columns
  - acknowledged_at added to ChecklistItemWithUpload interface in actions.ts
  - Task 2.4 patterns established:
  - Employer review page at app/(employer)/dashboard/onboarding/[id]/
  - reviewed_by column expects auth.users ID — use user.id not member.id
  - Action buttons must show even when viewError is set (remove !viewError condition)
  - adminClient required for checklist_items UPDATE (RLS blocks employer writes)
  - Signed URL "Object not found" = mismatch between storage file and DB file_path record
  - window.location.reload() used after approve/re-upload to refresh employer view
  - Task 2.5 complete
  - recalculate_onboarding_status(UUID) PostgreSQL function live in Supabase
  - Trigger checklist_status_changed fires on checklist_items changes automatically
  - Daily cron at app/api/cron/check-overdue/route.ts — 7am UTC
  - NEXT_PUBLIC_APP_URL updated to https://onboarding-platform.vercel.app
  - Project now live on GitHub at jasonvincent10/onboarding-platform
  - Build fixed: typedRoutes removed, clsx installed, TypeScript errors resolved
  - Task 2.6 complete
- Reminder cron at app/api/cron/reminders/route.ts — 8am UTC
- Email templates at lib/email/reminder-templates.ts
- REMINDER_WINDOW_DAYS = 3 for employee reminders
- Employer escalation uses two-step query (employer_members can't be joined 
  indirectly through onboarding_instances)
- Cron routes excluded from auth middleware via api/cron pattern in matcher
- Correct Vercel URL is onboarding-platform-inky.vercel.app (not onboarding-platform.vercel.app)
- NEXT_PUBLIC_APP_URL needs updating to https://onboarding-platform-inky.vercel.app
- Task 3.1 patterns established:
  - Portability config at lib/portability/categories.ts — defines universal/likely_stable/time_sensitive/employer_specific
  - Profile matcher at lib/portability/profile-matcher.ts — matches existing data to new checklist items
  - Server actions at lib/actions/portability-actions.ts — getPortableReviewData(), confirmPortableItems(), hasPortableData()
  - Review page at app/(employee)/employee/onboarding/[id]/review/page.tsx
  - PortableProfileReview client component at components/portability/PortableProfileReview.tsx
  - acceptInvitation() in app/join/actions.ts now checks hasPortableData() and redirects returning employees to /review
  - Pre-population sets was_pre_populated=true and status='submitted' on checklist_items
  - Consent records created per data_category when employee confirms carry-forward
  - Sensitive data shown masked on review page (NI: "AB ** ** ** C", bank: "****5678")
  - Document expiry checked — expired docs flagged with warning and blocked from carry-forward
  - P45 and policy_acknowledgements are never portable (employer-specific)
  - Right-to-work documents are portable if not expired
  - adminClient used for checklist_items UPDATE (same pattern as Task 2.4)
  - audit_log action: 'profile_data_carried_forward' with metadata showing items + categories
  - Task 3.1 complete — portable profile system live
  - Files: lib/portability/categories.ts, lib/portability/profile-matcher.ts,
    lib/actions/portability-actions.ts,
    app/(employee)/employee/onboarding/[id]/review/page.tsx,
    components/portability/PortableProfileReview.tsx
  - acceptInvitation() in app/join/actions.ts now checks hasPortableData() and 
    redirects returning employees to /review; first-time employees skip straight 
    to checklist
  - Pre-population sets was_pre_populated=true and status='submitted' on checklist_items
  - Consent records created per data_category when employee confirms carry-forward
  - Sensitive data shown masked on review page (NI: "AB ** ** ** C", bank: "****5678")
  - Document expiry checked — expired docs flagged with warning, blocked from carry-forward
  - Categories: universal (NI), likely_stable (bank, emergency, address), 
    time_sensitive (right_to_work), employer_specific (P45, policies)

- Critical gotchas discovered during 3.1 (apply to all future tasks):
  - employee_id on onboarding_instances stores employee_profiles.id, NOT auth.users.id
    — added getProfileIdForUser() helper to translate auth user → profile ID
  - audit_action enum was missing 'invitation_accepted' AND 'profile_data_carried_forward' 
    — added both via ALTER TYPE; insert errors silently broke acceptInvitation flow 
    for hours of debugging
  - DO NOT use employer_accounts!inner joins in queries — silently fails, returns null. 
    Fetch employer separately via two queries
  - Encryption env var is ENCRYPTION_KEY (NOT FIELD_ENCRYPTION_KEY as previously noted)
    — must be set in Vercel env vars too, not just .env.local
  - All portability read queries use adminClient — regular client + RLS too aggressive
  - Middleware (proxy.ts) needs /join AND /employee-login in both PUBLIC_ROUTES 
    and ALWAYS_ACCESSIBLE arrays
  - Join page must use adminClient for token lookup — anonymous visitors hit RLS
  - Page files MUST be named exactly page.tsx — Next.js won't route page-foo.tsx, 
    paget.ts, etc.
  - Employee login lives at /employee-login (route group (auth) is invisible in URL),
    NOT /auth/employee-login
  - useSearchParams() must be wrapped in <Suspense> for static prerender to succeed
  - form_field_key on template_items must be explicitly set on insert — older 
    employer templates created before fix have NULLs and need patching
  - When debugging server actions, audit_log inserts are useful but check enum 
    constraints first — silent enum failures look identical to "code never ran"
  - Same email cannot be both employer and employee in current routing — Task 3.4 
    will need a role chooser; for now use temporary employer_members deletion to test
    - Task 3.2 (consent management) is built but unverified — paused mid-test due to a profile_creation_failed bug in the signup/accept flow. Do not mark 3.2 complete. The consent gate code itself is not the bug; see task prompt below.
- Followup bug to fix later: acceptInvitation should reject linking an onboarding to an auth user who is also an employer_members row for the same employer (currently produces a corrupted record where the same human is both sides of the onboarding).
- **Profile creation is owned by `acceptInvitation`, not signup.** `signUpEmployee` only creates the auth user; the `employee_profiles` row is created via upsert in `acceptInvitation`. This handles brand-new employees and returning employees uniformly and is idempotent against DB triggers, retries, and races.
- **Use `.maybeSingle()` not `.single()`** when checking for optional row existence — `.single()` returns an error on zero rows, which can silently break conditional logic.
- **Use `upsert` with `onConflict`** for any "get-or-create" pattern on a table with a unique constraint. Select-then-insert is a race waiting to happen.
- Multi-line TypeScript generic type parameters cause parser errors in this setup. Keep `Record<...>` and similar generics on a single line, or extract to a named type. Same root cause as the multi-line JSX attribute issue.
- Consent is append-only. NEVER UPDATE or DELETE consent_records. Withdrawal = INSERT new row with `action = 'withdrawn'`. The `get_consent_status_for_employer` function and `has_active_consent` in SQL both read the latest row per category.
- Next.js 16 + Turbopack can serve a stale server-component render on the first reload after a data change. If a guard or redirect doesn't appear to fire, reload a second time before assuming there's a bug.
- Followup: consent integration into the existing `/review` page (returning-employee flow) is NOT built. 3.2 is verified for first-timers only. Returning-employee path needs a short follow-up task.
- Followup: `acceptInvitation` should reject linking an onboarding to an auth user who is also an employer_members row for the same employer.
## How to use this file

1. **Start every Claude conversation** by pasting the full contents of this file before your task prompt
2. **Update after each task** — fill in the schema, tick off tasks, note key decisions
3. **The Opus tasks** are: 1.2, 2.2, 3.1, 3.2, 4.4 — open in a fresh conversation, paste context first
4. **Don't skip ahead** — each phase builds on the previous one
