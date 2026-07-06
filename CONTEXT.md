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
| Payments | Stripe (per-hire billing) |
| Package manager | **npm only** — never yarn or pnpm |

**Live URL:** https://onboarding-platform-inky.vercel.app
**GitHub:** jasonvincent10/onboarding-platform (master branch)
**Local path:** `C:\Users\jason\OneDrive\Documents\Client Onboarder\onboarding-platform-scaffold\onboarding-platform`
(Run all terminal commands from the `onboarding-platform` subfolder, NOT the parent scaffold folder.)

---

## Database schema (10 tables, all RLS-enabled)

- `employer_accounts` — id, company_name, company_number, stripe_customer_id, subscription_status, onboardings_used
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

### RLS / helper functions
- Helper functions: `get_my_employer_id()`, `get_my_employee_id()`, `has_active_consent()`
- Employers see only their own org data; employees see only their own profile/documents/onboardings
- Employer access to documents requires BOTH active onboarding + active consent for that data_category
- consent_records and audit_log: INSERT + SELECT only (no UPDATE/DELETE)

### Utility / SQL functions
- `create_default_template(employer_id)` — creates Standard UK Onboarding template with 8 items on signup
- `get_consent_status_for_employer(employee_id, employer_id)` — returns latest action per category (migration 003, index `idx_consent_records_lookup`)
- `recalculate_onboarding_status(UUID)` — recalculates readiness; trigger `checklist_status_changed` fires on checklist_items changes
- NOTE: there are two overloaded `create_onboarding_from_template` functions in the DB, but **neither is actually called by the app** — the invite flow copies template_items → checklist_items via a direct `.insert()` in `app/(employer)/dashboard/invite/actions.ts`. That insert is the source of truth for what columns get copied.

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=https://onboarding-platform-inky.vercel.app
ENCRYPTION_KEY=        # 64-char hex (32 bytes), AES-256-GCM. MUST be set in Vercel env vars too, not just .env.local
CRON_SECRET=           # cron route auth
```
- Encryption env var is `ENCRYPTION_KEY` (NOT FIELD_ENCRYPTION_KEY)

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
- [ ] 3.6 Data export CSV

### Phase 4 — Billing & Launch
- [ ] 4.1 Stripe integration
- [ ] 4.2 Free trial / pilot mode
- [ ] 4.3 Legal pages (Sonnet draft, solicitor review)
- [ ] 4.4 Security hardening (Opus)
- [ ] 4.5 Error tracking + monitoring
- [ ] 4.6 Landing page + sign-up funnel

Opus tasks: 1.2, 2.2, 3.1, 3.2, 4.4. All others Sonnet.

---

## Recurring gotchas (apply to EVERY task)

- **`await createClient()`** everywhere — Next.js 16 made `cookies()` async; forgetting this causes subtle failures
- **Use `adminClient` (service role) for all RLS-protected writes** — checklist_items, employee_profiles, consent records, portability/document queries. Regular client + RLS is too aggressive for these.
- **`.maybeSingle()` not `.single()`** when a row may not exist — `.single()` errors on zero rows and silently breaks conditional logic
- **`upsert` with `onConflict`** for any get-or-create pattern — select-then-insert is race-prone
- **Do NOT use `employer_accounts!inner` (or similar) joins** — they silently return null. Fetch with separate two-step queries. Supabase can't auto-traverse indirect relationships in nested selects.
- **Keep JSX attributes on a single line**, and keep multi-line TS generics (`Record<...>`) on one line or extract to a named type — both cause Turbopack/parser errors in this setup. Avoid non-ASCII symbols (↗, …, HTML entities) in JSX.
- **Client Components can't receive function props from Server Components** — pass data only; do redirects via `useRouter().push()/refresh()` inside the client component
- **`audit_action` enum must be kept up to date** — missing values cause silent insert failures that look identical to "code never ran." Check enum constraints first when debugging server actions.
- **Always check the `error` returned from an `audit_log` insert, or at minimum know it can fail silently** — `requestReupload()` inserted an enum value (`checklist_item_reupload_requested`) that didn't exist in `audit_action` for an unknown period before being caught in 3.5. The insert's error was never read, so this failed with no visible symptom.
- **`reviewed_by`** is a FK to `auth.users` — use `user.id`, not `member.id`
- **Turbopack can serve a stale server-component render** on the first reload after a data change — reload a second time before concluding a guard/redirect is broken
- **Page files must be named exactly `page.tsx`** — Next.js won't route `page-foo.tsx` etc.
- **`useSearchParams()` must be wrapped in `<Suspense>`** for static prerender
- **Consent is append-only** — NEVER UPDATE/DELETE consent_records; withdrawal = INSERT new row with `action = 'withdrawn'`
- **Vercel redeploy button re-runs the existing commit** — new local files require `git push` first
- **middleware.ts is now `proxy.ts`** in Next.js 16; needs `/join` AND `/employee-login` in both PUBLIC_ROUTES and ALWAYS_ACCESSIBLE
- **Resend free tier** only delivers to the verified signup address during dev; from address `onboarding@resend.dev`; email confirmation must be OFF in Supabase Auth settings
- **Testing:** two entirely different browsers for simultaneous employer/employee sessions (same-browser incognito shares the cookie jar)
- **Tailwind dynamic/responsive classes inside template literals can silently fail to generate** even after `.next` cache clear and safelist entries — for critical show/hide breakpoint logic, prefer a raw `<style>` tag with a real `@media` query over `lg:` prefixes combined with conditional className strings.
- **Chrome DevTools device toolbar (Responsive mode, typed dimensions) can fail to trigger a real resize/media-query re-evaluation** — if a responsive fix "isn't working," verify with an actual browser window resize before concluding the code is broken.

---

## File / route map

- Employee routes: `app/(employee)/employee/dashboard`, `.../onboarding/[id]`, `.../onboarding/[id]/item/[itemId]/page.tsx`
- Employee login: `/employee-login` (route group `(auth)` is invisible in the URL)
- Join flow: `/join?token=xxx` → `acceptInvitation()` in `app/join/actions.ts`
- Employer invite: `app/(employer)/dashboard/invite/` (page.tsx + InviteForm.tsx + actions.ts)
- Employer review: `app/(employer)/dashboard/onboarding/[id]/`
- Admin client: `lib/supabase/admin.ts` (`createAdminClient()`)
- Encryption: `lib/encryption.ts` (AES-256-GCM; format `iv.authTag.ciphertext`, dot-separated base64)
- Forms: `components/forms/` — NINumberForm, BankDetailsForm, EmergencyContactsForm, FormEntryHandler (routes on form_field_key), PolicyAcknowledgement, RightToWorkUpload
- Form/policy/RTW actions: `lib/actions/form-actions.ts`, `policy-actions.ts`, `rtw-actions.ts`
- Portability: `lib/portability/categories.ts`, `lib/portability/profile-matcher.ts`, `lib/actions/portability-actions.ts`, `components/portability/PortableProfileReview.tsx`, review page `app/(employee)/employee/onboarding/[id]/review/page.tsx`
- Consent service: `lib/consent.ts` (DATA_CATEGORIES, CATEGORY_INFO, getRequiredCategories, getConsentStatus, hasActiveConsent, grantConsent, withdrawConsent); standing management page `/employee/consents`
- Upload: `components/upload/DocumentUpload.tsx`; storage bucket `employee-documents` (private, 10MB, PDF/JPG/PNG); path `{user_id}/{document_type_slug}_{timestamp}.{ext}`
- Email: `lib/email/invite-template.ts`, `lib/email/reminder-templates.ts`
- Cron: `app/api/cron/check-overdue/route.ts` (7am UTC), `app/api/cron/reminders/route.ts` (8am UTC, REMINDER_WINDOW_DAYS=3); cron routes excluded from auth middleware via api/cron matcher pattern

---

## Per-task notes (condensed)

- **1.5 invite flow:** validate → get employer_id via employer_members → duplicate guard (same employer_id + invitee_email + status in pending/in_progress) → insert onboarding_instance → copy template_items → checklist_items (deadline = start_date − deadline_days_before_start) → send email (non-fatal on failure) → audit_log. Invite URL: `{NEXT_PUBLIC_APP_URL}/join?token={invitation_token}`.
- **2.1 upload:** browser → Supabase Storage → recordDocumentUpload() → document_uploads row → checklist_items status='submitted'. checklist_items has no FK to document_uploads — split getChecklistItem() into two queries. document_uploads insert needs `document_name` (NOT NULL).
- **2.2 forms:** encrypt sensitive fields before write; form_field_key values 'ni_number'/'bank_details'/'emergency_contacts'; NI validation = HMRC prefix/suffix rules; bank = format-only for MVP (full Vocalink modulus check deferred to 4.4); emergency contacts JSONB, not encrypted, max 3.
- **2.3 policy:** acknowledgement writes checklist_items.status='submitted' + acknowledged_at, consent_records INSERT (granted), audit_log INSERT. Content from checklist_items.description or policy_document_path (PDF signed URL).
- **2.4 review:** view file via signed URL; one-click approve / re-upload with mandatory note; adminClient for checklist_items UPDATE; `window.location.reload()` after action. Signed-URL "Object not found" = storage file vs DB file_path mismatch.
- **3.1 portability:** matcher categorises fields universal (NI) / likely_stable (bank, emergency, address) / time_sensitive (right_to_work) / employer_specific (P45, policies). Pre-population sets was_pre_populated=true, status='submitted'. Sensitive data masked on review (NI "AB ** ** ** C", bank "****5678"). Expired docs flagged + blocked from carry-forward. audit action 'profile_data_carried_forward'.
- **3.2 consent:** first-time accepters → `/employee/onboarding/[id]/consent` (opt-in per required category). Returning employees with portable data → `/review`. Checklist page has a safety-net guard: won't render unless every required category has active granted consent, else redirects to `/consent`.
- **3.2b:** confirmPortableItems() grants consent for ALL required categories (not just portable ones); review-page Skip button → `/consent` gate.
- **3.3 right to work (COMPLETE):**
  - `components/forms/RightToWorkUpload.tsx` — doc type selector (passport, BRP, share code, visa, ILR), per-type guidance, file upload OR GOV.UK share code input, expiry capture where relevant
  - `lib/actions/rtw-actions.ts` — handles file uploads and share codes; share codes stored in file_path with `share_code:` prefix
  - Item page routes `data_category === 'right_to_work'` to RightToWorkUpload instead of generic DocumentUpload
  - `ExistingFileReadOnly` detects `share_code:` prefix → renders code + GOV.UK verify link instead of a file preview
  - Verified end-to-end (file/passport path): submit → checklist_items.status flows submitted → approved correctly, document_upload_id linked
  - **3.4 UI polish + responsive design (COMPLETE, 3 passes):**
  - **Pass 1 (employee journey):** Inline styles → Tailwind across NINumberForm, BankDetailsForm, EmergencyContactsForm, PolicyAcknowledgement, FormEntryHandler, DocumentUpload, RightToWorkUpload. Emoji/HTML entities/ellipsis chars removed throughout (Turbopack parser sensitivity). Two-step employer_accounts fetch via adminClient added to employee dashboard, checklist page, and item page — indirect `employer_accounts (company_name)` joins were silently returning null under RLS. `.single()` → `.maybeSingle()` wherever a row may not exist. RTW upload had no success-path navigation at all (fell out of try block silently) — fixed with `window.location.href` redirect (router.push + router.refresh was self-cancelling). ChecklistItems.tsx created as a client component for per-item navigation spinner. Loading states on all form submit buttons via local state + spinner SVG. Empty states added for employee dashboard (no onboardings) and checklist page (no items).
  - **Pass 2 (employer journey):** Same indirect-join fix applied to employer dashboard (employer_members → employer_accounts) and OnboardingDetailView. Employer dashboard table (fixed-width grid-cols) replaced with card-based mobile layout below `sm:`, original table preserved above `sm:`. Inline styles, arrow characters, ellipsis chars removed from OnboardingDetailView (approve/reject buttons, modal). Spinner added to approve button.
  - **Pass 3 (layout shells):** EmployeeNav required no changes — already mobile-friendly. SidebarNav (employer) required a full mobile nav rebuild: hamburger top bar + slide-in panel. **Key learning: Tailwind responsive/dynamic classes (`lg:flex`, template-literal `${cond ? 'flex' : 'hidden'}`) were unreliable in this setup** — JIT scanner intermittently failed to generate the classes even after cache clears and safelist additions. Resolved by injecting a raw `<style>` tag with hand-written CSS and a real `@media (min-width: 1024px)` query, fully bypassing Tailwind class generation for the sidebar show/hide logic. **Also: Chrome DevTools "Responsive" device toolbar with typed dimensions did NOT reliably trigger media query re-evaluation in this debugging session** — resizing the actual browser window worked when the emulator appeared not to. For any future viewport-dependent bug, test with a real window resize before assuming the code is wrong.
- **3.5 audit trail (COMPLETE):**
  - Coverage check found most insert sites already logging correctly from earlier tasks (rtw-actions.ts, recordDocumentUpload, approveChecklistItem) — only real gaps were profile-access reads (getSignedDocumentUrl, getDecryptedFormData in employer onboarding actions.ts) and consent grant/withdraw (lib/consent.ts), both now logging `profile_accessed` / `consent_granted` / `consent_withdrawn`.
  - `audit_action` enum already covered every value needed (`document_uploaded`, `profile_accessed`, `consent_granted`, `consent_withdrawn`, `checklist_item_approved`, `checklist_item_rejected`, `profile_data_carried_forward`) — no migration required.
  - **Bug found and fixed:** `requestReupload()` was inserting `action: 'checklist_item_reupload_requested'`, a value that does not exist in the `audit_action` enum. Corrected to `checklist_item_rejected` (which is in the enum and was otherwise unused). Insert errors here were not being checked/surfaced, so this had likely been failing silently since 2.4.
  - New read-only employer view at `app/(employer)/dashboard/onboarding/[id]/audit/page.tsx` — queries audit_log via adminClient filtered by employer_id, then filters in JS by `metadata.onboarding_id` (no dedicated onboarding_id column on audit_log itself). Fine at current volume; revisit as a JSONB query (`metadata->>'onboarding_id'`) inside the `.eq()` if the table grows.
  - **Known inconsistency, accepted as-is:** `grantConsent`/`withdrawConsent` log `actor_id` as the employee's `employee_profiles.id`, not the auth `user.id` used everywhere else in the codebase (form-actions, rtw-actions, recordDocumentUpload, approveChecklistItem all use `user.id`). `audit_log.actor_id` has no FK constraint so this doesn't break anything, but it means `actor_id` isn't a consistent ID space across all audit rows. Low priority; would need `grantConsent`/`withdrawConsent` to accept the auth user id as a parameter to fix properly.

---

## Outstanding bugs / TODOs (not blockers)

- **document_uploads.verification_status not synced on approval.** Task 2.4's approve/reject updates checklist_items.status but leaves document_uploads.verification_status = 'pending'. Affects all document types. Consider syncing both in the approve/reject action.
- **consent_records/audit_log actor_id inconsistency.** `grantConsent`/`withdrawConsent` (lib/consent.ts) log `audit_log.actor_id` as `employee_profiles.id`, while every other insert site in the app (form-actions, rtw-actions, recordDocumentUpload, approveChecklistItem) uses the auth `user.id`. No FK constraint on `actor_id` so nothing breaks, but querying "all actions by this actor" across the table won't be reliable until this is unified. Fix = pass the auth user id into grantConsent/withdrawConsent from their call sites.
- **Session routing bug.** Clicking an invite/join link while another session exists in the same browser sometimes lands on the employer dashboard instead of the employee checklist/join flow. Workaround during testing: re-open the invite link from the email. Likely tied to acceptInvitation / role-detection — relevant to 3.4.
- **GOV.UK share code path untested end-to-end.** File/passport path fully verified; share code submission + employer-side display (code + verify link) not yet exercised.
- **acceptInvitation should reject** linking an onboarding to an auth user who is also an employer_members row for the same employer (currently produces a corrupted record where the same human is both sides).
- **Same email can't be both employer and employee** in current routing — 3.4 will need a role chooser; for now use temporary employer_members deletion to test.
- **Task 3.4 standalone employee sign-in:** add a sign-in page so returning employees can check progress without re-using an invite link (redirect to /employee/dashboard when no token present). Note prior conflicting notes on path — current employee login is `/employee-login`, NOT `/auth/employee-login`.
- **Minor:** migration file `001_initial_schema.sql` has a double `.sql.sql` extension to correct.
- **Profile creation is owned by `acceptInvitation`, not signup.** signUpEmployee only creates the auth user; the employee_profiles row is created via upsert in acceptInvitation (idempotent against triggers/retries/races).
- Before launch: rename middleware → proxy convention; replace Resend from-address with verified domain; real-time on checklist_items requires REPLICA IDENTITY FULL + adding to supabase_realtime publication via SQL.
- Employee can reach checklist item pages directly, bypassing the /consent 
  gate — no server-side guard confirmed on direct navigation. Needs a check 
  before form submission that active consent exists.
- No navigation link anywhere in the employee UI to /employee/consents — 
  page works but is undiscoverable without knowing the URL.
---
---

## Notes / things to remember

- Security hardening pass (Jul 2026): fixed cross-tenant document/checklist
  access (adminClient calls now verify ownership before every write), 
  consent now actually gates employer access to NI/bank details, and the 
  invitation accept flow now derives identity from session not params. 
  Full detail in Docs/security-fixes-2026-07-03.md.
- Any new adminClient usage MUST verify caller identity + resource 
  ownership in code before the query — RLS is bypassed entirely.
- Encryption key env var is ENCRYPTION_KEY (not FIELD_ENCRYPTION_KEY — 
  that was a dead/unused module, now deleted).

---
## How to use this file

1. Start every Claude conversation by pasting this whole file before your task prompt.
2. Update after each task — tick tasks, add condensed notes, log new bugs.
3. Opus tasks: 1.2, 2.2, 3.1, 3.2, 4.4 — fresh conversation, paste context first.
4. Don't skip ahead — each phase builds on the previous one.