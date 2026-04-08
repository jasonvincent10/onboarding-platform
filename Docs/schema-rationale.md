# Schema Design Rationale & CONTEXT.md Update

## Tables Summary (10 tables)

| Table | Purpose | Owned By |
|---|---|---|
| `employer_accounts` | Company entity — name, billing, Stripe link | Employer |
| `employer_members` | Links auth.users → employer. One owner per org for MVP, multi-user ready | Employer |
| `employee_profiles` | The portable profile. NI/bank encrypted at field level | Employee |
| `onboarding_templates` | Employer-defined checklists. Default UK template auto-created on signup | Employer |
| `template_items` | Individual items within a template (document/form/acknowledgement) | Employer |
| `onboarding_instances` | One hire = one instance. Links employee ↔ employer with invitation flow | Employer (employee read) |
| `checklist_items` | Copied from template_items when onboarding starts. Tracks per-item status | Employer (employee write) |
| `document_uploads` | Files attached to **employee profile** (not onboarding). Portability core | Employee |
| `consent_records` | Append-only. Granular per data-category, per employer. GDPR compliant | System (both read) |
| `audit_log` | Append-only. Every significant action logged with actor + timestamp | System (both read) |

---

## Key Design Decisions

### 1. Why `employer_members` exists (even for MVP)
The blueprint says "one HR person." But adding a join table now costs nothing and avoids a painful migration later when the first customer asks "can my colleague also review documents?" The `role` column is a simple text field — no complex RBAC yet.

### 2. Why `template_items` is separate from `checklist_items`
Templates are reusable blueprints. Checklist items are concrete instances tied to a specific onboarding. When an employer updates their template, it should NOT retroactively change active onboardings. The `create_onboarding_from_template` function copies items at creation time.

### 3. Encrypted fields use `_encrypted` suffix
Any column ending in `_encrypted` must be AES-256 encrypted by the application before writing and decrypted after reading. This is a developer convention — the database stores opaque ciphertext. The columns are TEXT type because ciphertext is a string. Task 2.2 will implement the encryption utility.

### 4. Consent is append-only
`consent_records` has no UPDATE or DELETE RLS policies. To withdraw consent, you INSERT a new row with `action = 'withdrawn'`. The `has_active_consent()` function checks the most recent row. This gives you a complete audit trail of when consent was granted and withdrawn — critical for GDPR compliance.

### 5. Document expiry matters for portability
`document_uploads.expiry_date` is essential for right-to-work documents. A visa or BRP expires. When the portable profile pre-populates a new onboarding, the system must check expiry and flag expired documents rather than silently re-using them. Task 3.1 will implement this logic.

### 6. `onboarding_instances.invitation_token` handles the timing gap
The employee might not have an account when the employer sends the invitation. The token in the invitation email lets the system match the onboarding to the employee when they sign up. The `invitee_email` field provides a second matching mechanism.

### 7. `checklist_items.was_pre_populated` tracks portability
When the portable profile fills in a checklist item automatically, this flag is set. It serves two purposes: UX (show the employee which items came from their existing profile) and analytics (measure how much time portability saves).

### 8. `data_category` enum drives consent granularity
Every template item, document upload, and consent record uses the same `data_category` enum. This creates a clean join: "Does this employer have consent to see this employee's bank_details?" The categories are: personal_info, ni_number, bank_details, emergency_contacts, right_to_work, documents, policy_acknowledgements.

---

## RLS Policy Summary

| Table | Employee Access | Employer Access |
|---|---|---|
| `employer_accounts` | — | Own company only |
| `employer_members` | — | Own company members |
| `employee_profiles` | Own profile (full CRUD) | Name/email only, for employees in their onboardings |
| `onboarding_templates` | — | Own templates (full CRUD) |
| `template_items` | — | Items in own templates (full CRUD) |
| `onboarding_instances` | Own onboardings (read + accept) | Own onboardings (read + create + update) |
| `checklist_items` | Own onboarding items (read + submit) | Own onboarding items (read + review) |
| `document_uploads` | Own documents (full CRUD) | Only with active consent + active onboarding |
| `consent_records` | Own records (read + insert) | Records involving them (read only) |
| `audit_log` | Own entries (read + insert) | Own entries (read + insert) |

**Critical constraint on `document_uploads`:** The employer SELECT policy requires BOTH an active onboarding instance linking the employee AND active consent for the document's data category. This is the GDPR enforcement layer.

---

## Storage Bucket Setup (Manual Step)

In Supabase Dashboard → Storage:
1. Create bucket: `employee-documents`
2. Private (not public)
3. File size limit: 10MB
4. Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`
5. File path convention: `{user_id}/{document_type}_{timestamp}.{ext}`

---

## Copy This Into Your CONTEXT.md

Replace the "Database schema" section with:

```markdown
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
```
