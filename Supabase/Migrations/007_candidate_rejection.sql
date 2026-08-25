-- Migration 007: candidate rejection + scheduled data purge.
--
-- Product decision (2026-08-25): an employer can reject a candidate at any
-- point during onboarding. 7 days after rejection, that candidate's
-- sensitive data (uploaded documents, encrypted profile fields) is purged
-- automatically. Confirmed hires are NOT affected -- UK law requires
-- right-to-work evidence be kept for the duration of employment + 2 years
-- after, so nothing about the confirmed/complete path changes here.
--
-- audit_log is append-only (no UPDATE/DELETE, enforced by RLS) with FKs to
-- onboarding_instances/employee_profiles/auth.users that have no cascade
-- rule -- so purging does NOT hard-delete those rows. It deletes the
-- sensitive content (document_uploads + Storage objects, encrypted profile
-- fields) and marks the onboarding purged, keeping a minimal historical
-- record (who applied, that they were rejected, when data was purged)
-- without retaining the personal data itself. This is exactly what GDPR's
-- right-to-erasure allows for (Article 17(3) -- legitimate record-keeping).

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'candidate_rejected';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'candidate_data_purged';

ALTER TABLE onboarding_instances
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS data_purged_at timestamptz;

-- Pre-existing bug fix: audit_log.actor_id was NOT NULL despite actor_type
-- having a documented 'system' value with no real user behind it -- the
-- Stripe webhook's payment_completed audit insert (actor_id: null) has
-- been silently failing every time since 001_initial_schema.sql, since
-- that insert's error return is never checked. The credit grant itself
-- still succeeds (separate call), so this was invisible in normal use.
ALTER TABLE audit_log ALTER COLUMN actor_id DROP NOT NULL;
