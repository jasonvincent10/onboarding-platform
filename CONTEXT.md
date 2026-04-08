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
- [ ] **2.5** Status engine *(Sonnet)*
- [ ] **2.6** Automated email reminders *(Sonnet)*

### Phase 3 — Portability & Polish (Weeks 7–9)
- [ ] **3.1** Portable profile logic *(Opus)*
- [ ] **3.2** Consent management *(Opus)*
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
  - Env var is FIELD_ENCRYPTION_KEY (64-char hex string, 32 bytes)
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
## How to use this file

1. **Start every Claude conversation** by pasting the full contents of this file before your task prompt
2. **Update after each task** — fill in the schema, tick off tasks, note key decisions
3. **The Opus tasks** are: 1.2, 2.2, 3.1, 3.2, 4.4 — open in a fresh conversation, paste context first
4. **Don't skip ahead** — each phase builds on the previous one
