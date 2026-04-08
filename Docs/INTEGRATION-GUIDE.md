# Task 2.2 Integration Guide — Encrypted Form Fields

## Overview

This task adds three form types to the employee checklist:
- **NI Number** — UK format validation, AES-256-GCM encrypted before storage
- **Bank Details** — Sort code + account number validation, both encrypted
- **Emergency Contacts** — Dynamic list of 1-3 contacts, stored as JSONB (not encrypted)

## Files to copy into your project

Copy these files into your project, maintaining the folder structure:

```
onboarding-platform/
├── lib/
│   ├── encryption.ts                          ← NEW
│   ├── validation/
│   │   ├── ni-number.ts                       ← NEW
│   │   ├── bank-details.ts                    ← NEW
│   │   └── emergency-contacts.ts              ← NEW
│   └── actions/
│       └── form-actions.ts                    ← NEW
├── components/
│   └── forms/
│       ├── NINumberForm.tsx                   ← NEW
│       ├── BankDetailsForm.tsx                ← NEW
│       ├── EmergencyContactsForm.tsx          ← NEW
│       └── FormEntryHandler.tsx               ← NEW
└── migrations/
    └── task-2.2-encrypted-forms.sql           ← Run in Supabase SQL Editor
```

## Step-by-step setup

### Step 1: Generate your encryption key

Open PowerShell and run:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This outputs a 64-character hex string. Copy it.

### Step 2: Add the encryption key to your environment

Open `.env.local` in your project root and add:

```
ENCRYPTION_KEY=paste_your_64_char_hex_string_here
```

**IMPORTANT:** Also add this to your Vercel environment variables before deploying. Never commit this key to Git.

### Step 3: Run the database migration

Open Supabase Dashboard → SQL Editor and run the contents of `migrations/task-2.2-encrypted-forms.sql`.

This adds the `bank_account_holder_name` column to `employee_profiles`.

Check whether your `audit_log.action` column is a TEXT type or an enum. If it's an enum, you also need to uncomment and run the `ALTER TYPE` line in the migration to add `'form_submitted'` as a valid value.

### Step 4: Copy all the new files

Copy the files listed above into your project. Make sure the `lib/validation/` and `lib/actions/` directories exist.

PowerShell commands:

```powershell
# Create directories if they don't exist
New-Item -ItemType Directory -Force -Path "lib\validation"
New-Item -ItemType Directory -Force -Path "lib\actions"
New-Item -ItemType Directory -Force -Path "components\forms"
```

Then copy each file into the matching location.

### Step 5: Wire FormEntryHandler into your existing item page

Your existing item page is at:
`app/(employee)/employee/onboarding/[id]/item/[itemId]/page.tsx`

This page currently handles `document_upload` type items. You need to add a branch for `form_entry` items.

Open that file and make these changes:

**1. Add the import at the top:**

```tsx
import FormEntryHandler from '@/components/forms/FormEntryHandler';
```

**2. Find where you render based on item type.** You likely have something like:

```tsx
if (item.item_type === 'document_upload') {
  // ... existing DocumentUpload component
}
```

**3. Add the form_entry branch:**

```tsx
if (item.item_type === 'form_entry') {
  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Back link */}
      <a
        href={`/employee/onboarding/${params.id}`}
        style={{ color: '#6b7280', fontSize: '0.875rem', textDecoration: 'none' }}
      >
        ← Back to checklist
      </a>

      <div style={{ marginTop: '1.5rem' }}>
        <FormEntryHandler
          onboardingId={params.id}
          checklistItemId={params.itemId}
          formFieldKey={item.form_field_key}
          itemName={item.item_name}
          itemDescription={item.description}
          status={item.status}
        />
      </div>
    </div>
  );
}
```

**4. Make sure your query fetches `form_field_key`.** In your `getChecklistItem()` query or wherever you load the checklist item, ensure `form_field_key` is in the SELECT:

```tsx
const { data: item } = await supabase
  .from('checklist_items')
  .select('*, form_field_key')  // ← make sure form_field_key is included
  .eq('id', itemId)
  .single();
```

If `checklist_items` doesn't have a `form_field_key` column (it might only be on `template_items`), you have two options:

**Option A (recommended):** Add `form_field_key` to the `checklist_items` table. It should already be copied from `template_items` when `create_onboarding_from_template()` runs. Check your `create_onboarding_from_template` function — if it doesn't copy `form_field_key`, add it. Then run:

```sql
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS form_field_key TEXT;
```

And update `create_onboarding_from_template()` to copy it:
```sql
INSERT INTO checklist_items (..., form_field_key)
SELECT ..., ti.form_field_key
FROM template_items ti WHERE ...
```

**Option B:** Look up the `form_field_key` from the linked `template_item_id`:

```tsx
const { data: templateItem } = await supabase
  .from('template_items')
  .select('form_field_key')
  .eq('id', item.template_item_id)
  .single();
```

Option A is cleaner for the long term.

### Step 6: Verify form_field_key values in your default template

Check your `create_default_template()` function in Supabase. The template items with `item_type = 'form_entry'` should have these `form_field_key` values:

| Item Name | form_field_key |
|---|---|
| National Insurance Number | `ni_number` |
| Bank Details | `bank_details` |
| Emergency Contacts | `emergency_contacts` |

If these don't match, update them in the function or directly in the `template_items` table.

### Step 7: Test

1. Start your dev server: `npm run dev`
2. Log in as an employer and invite a test employee
3. Log in as the employee and go to the onboarding checklist
4. Click the NI Number item — you should see the NI form
5. Enter a valid NI number (e.g. `AB123456C`) and submit
6. Check the checklist — it should show as "Submitted"
7. Check Supabase → `employee_profiles` table — the `ni_number_encrypted` column should contain an encrypted string (three dot-separated base64 values)
8. Repeat for Bank Details and Emergency Contacts

## Troubleshooting

**"ENCRYPTION_KEY environment variable is not set"**
→ Check `.env.local` has the ENCRYPTION_KEY line. Restart your dev server after adding it (`Ctrl+C` then `npm run dev`).

**"Invalid encrypted value format"**
→ The value in the database isn't in the expected `iv.authTag.ciphertext` format. This can happen if you stored plaintext before encryption was wired up. Clear the field in Supabase and re-enter via the form.

**Form doesn't appear / "Unknown form type"**
→ The `form_field_key` value doesn't match `ni_number`, `bank_details`, or `emergency_contacts`. Check the value in your `checklist_items` or `template_items` table.

**"Failed to save NI number" (or bank details)**
→ Check the browser console and terminal for the detailed error. Common causes: RLS policy blocking the UPDATE on `employee_profiles`, or the `employee_profiles` row doesn't exist for this user (should have been created by `acceptInvitation()`).

**Sort code auto-formatting not working**
→ Make sure you're using the BankDetailsForm component, not a plain input. The auto-formatting is in the `handleSortCodeChange` function.

**audit_log insert fails**
→ If `action` is an enum column, you need to add `'form_submitted'` as a valid value. See the migration SQL.

## What this task does NOT include (by design)

- **Full Vocalink modulus checking** for bank details — deferred to Task 4.4 (security hardening). The current validation checks format only.
- **Employer view of encrypted data** — Task 2.4 (employer review workflow) will need to call `getExistingProfileData()` or a similar server action to decrypt and display the data to the employer (with consent check).
- **Re-upload/correction flow** — If an employer rejects the data, the employee can simply re-open the form item and re-submit. The existing value pre-populates the form.

## CONTEXT.md update

Add to your "Notes / things to remember" section:

```
- Task 2.2 patterns established:
  - Encryption utility at lib/encryption.ts — AES-256-GCM, server-side only
  - Storage format: iv.authTag.ciphertext (dot-separated base64 in TEXT columns)
  - ENCRYPTION_KEY env var: 64-char hex string (32 bytes), must be in .env.local AND Vercel
  - Validation at lib/validation/ — ni-number.ts, bank-details.ts, emergency-contacts.ts
  - Server actions at lib/actions/form-actions.ts — validate → encrypt → update profile → update checklist status → audit log
  - Form components at components/forms/ — NINumberForm, BankDetailsForm, EmergencyContactsForm
  - FormEntryHandler routes to correct form based on checklist item's form_field_key
  - form_field_key values: 'ni_number', 'bank_details', 'emergency_contacts'
  - NI validation follows HMRC rules (prefix/suffix letter restrictions)
  - Bank validation is format-only for MVP — full Vocalink modulus check deferred to Task 4.4
  - Emergency contacts stored as JSONB (not encrypted), max 3 contacts
  - bank_account_holder_name column added to employee_profiles (not encrypted)
  - Decrypted values sent to client over HTTPS for form pre-population (employee's own data only)
  - getExistingProfileData() server action returns decrypted profile for form pre-fill
  - Task 2.4 will need to use decryption to show employer the submitted data (with consent check)
```

Mark Task 2.2 as complete:
```
- [x] **2.2** Form-based data entry — NI, bank, emergency contacts *(Opus)*
```
