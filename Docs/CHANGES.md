# Security Hardening Fixes — Pre-Phase-4

Four replacement files. Copy each over the existing file at the same path in
your project, then follow the manual steps below.

## Files in this package

### 1. `app/(employer)/dashboard/onboarding/[id]/actions.ts`
Fixes Blockers 1, 2 and 4 from the review:
- `getSignedDocumentUrl` now verifies the document belongs to the employee on
  the verified onboarding AND that active consent exists for the document's
  data category before signing a URL. Previously any employer could download
  any document in the system. Audit action changed from `profile_accessed` to
  the more precise `document_viewed` (already in your enum).
- `getDecryptedFormData` now checks active consent before decrypting NI or
  bank details. Consent withdrawal now actually cuts off employer access.
- `approveChecklistItem` and `requestReupload` are now scoped to the verified
  onboarding (`.eq('onboarding_id', ...)`) and verify a row was actually
  updated. Previously any employer could modify any checklist item.
- New shared helpers: `getVerifiedEmployerContext()` (auth + ownership in one
  place) and `hasActiveConsentAdmin()` (fails closed on error).
- No signature changes — all exports keep the same names and parameters, so
  `OnboardingDetailView` and the page components need no edits.

### 2. `lib/actions/rtw-actions.ts`
Fixes Blocker 3:
- `submitRightToWork` now verifies the checklist item belongs to the stated
  onboarding AND that onboarding belongs to the calling employee, before any
  write. The checklist update is also scoped to the onboarding id.
- No signature change.

### 3. `app/join/actions.ts` — SIGNATURE CHANGED
Fixes Blocker 5:
- `acceptInvitation(token)` — now takes ONLY the token. Identity comes from
  the session; the onboarding is looked up by token, not by a caller-supplied
  id. The old signature let a caller pass an arbitrary userId and
  onboardingId.
- Employer sessions are rejected (`employer_session` error) instead of
  silently creating an employee profile for the employer's auth user and
  mis-claiming the onboarding. This was the root cause of your recurring
  "invite link lands on the employer dashboard" bug.
- The claim update now verifies a row was actually updated — a token
  mismatch can no longer report success.
- Email mismatch between the accepting account and the invitee email is
  recorded in the audit metadata (`email_matches_invite`) but does not block,
  since forwarded invites to a different address are legitimate.
- The only caller was `app/join/page.tsx`, which is updated in this package.

### 4. `app/join/page.tsx`
- Employer sessions now see a clear interstitial ("sign out or open in a
  different browser") instead of triggering the mis-claim. Plain ASCII and
  Tailwind-only, per your Turbopack constraints.
- Calls the new one-argument `acceptInvitation(token)`.
- Redirect target for a missing/invalid token corrected from `/auth/login`
  (a route that does not exist in your middleware PUBLIC_ROUTES) to `/login`.

## Manual steps after copying the files

1. **Rotate the Supabase service-role key.** Your uploaded zip contained
   `.env.local` with live secrets. Supabase Dashboard -> Settings -> API ->
   roll the service_role key, then update `SUPABASE_SERVICE_ROLE_KEY` in
   Vercel and your local `.env.local`. Exclude `.env*` from any future zips.

2. **Delete the dead encryption module:** remove `lib/utils/encryption.ts`.
   It is unused, reads a different env var (`FIELD_ENCRYPTION_KEY`), and uses
   an incompatible ciphertext format. Leaving it invites a future bug.

3. **Fix `.env.local.example`:** change `FIELD_ENCRYPTION_KEY=` to
   `ENCRYPTION_KEY=` — the live code in `lib/encryption.ts` reads
   `ENCRYPTION_KEY`. Update CONTEXT.md to match.

4. **Verify the audit enum on the live database.** The code inserts
   `form_submitted`, `invitation_accepted`, `policy_acknowledged` and
   `profile_data_carried_forward`, none of which are in the
   `001_initial_schema` migration. Run in the SQL editor:

       select unnest(enum_range(null::audit_action));

   If any of the four are missing, add them:

       alter type audit_action add value if not exists 'form_submitted';
       alter type audit_action add value if not exists 'invitation_accepted';
       alter type audit_action add value if not exists 'policy_acknowledged';
       alter type audit_action add value if not exists 'profile_data_carried_forward';

   Then save these statements as a new migration file so the repo matches
   the live schema.

5. **Test plan** (employer in Edge, employee in Chrome, per your usual setup):
   - Employer: open an onboarding, view a document, approve an item,
     request a re-upload — all should behave exactly as before.
   - Employee: withdraw consent for bank_details on /employee/consents,
     then as the employer try to view bank details — should now be refused.
     Re-grant consent — should work again.
   - Click an invite link while signed in as the employer — should show the
     new interstitial, NOT the dashboard, and the onboarding must remain
     unclaimed (employee_id still null in the DB).
   - Accept the same invite as the employee in the other browser — normal
     flow, including the portable-profile /review path for returning users.
   - Right to work submission still works end to end.

6. **Deploy:** commit and `git push` (the Vercel Redeploy button will not
   pick up these files).

## Known behaviour changes to be aware of
- An employer whose consent has been withdrawn now sees an explanatory error
  instead of the decrypted data or document link. This is intended.
- `acceptInvitation` returns `already_completed` for completed onboardings
  (page redirects before this in normal flow).
- Approve/re-upload on an item that does not belong to the onboarding now
  returns "Not authorised" instead of silently succeeding.
