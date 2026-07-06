-- Migration 002: Data export (Task 3.6) + per-hire billing (Phase 4)
-- Run in Supabase SQL Editor.

-- 1. Audit action enum: add export value (safe if already present)
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'data_exported';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'payment_completed';

-- 2. Billing columns on employer_accounts
ALTER TABLE employer_accounts
  ADD COLUMN IF NOT EXISTS paid_credits integer NOT NULL DEFAULT 0;

-- onboardings_used already exists per original schema; add defensively
ALTER TABLE employer_accounts
  ADD COLUMN IF NOT EXISTS onboardings_used integer NOT NULL DEFAULT 0;

-- 3. Atomic slot consumption. Free limit = 3 onboardings, then paid credits.
-- Returns true if a slot was consumed, false if the employer must pay first.
CREATE OR REPLACE FUNCTION consume_onboarding_slot(p_employer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_free_limit constant integer := 3;
  v_used integer;
  v_credits integer;
BEGIN
  SELECT onboardings_used, paid_credits
    INTO v_used, v_credits
    FROM employer_accounts
    WHERE id = p_employer_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_used < v_free_limit THEN
    UPDATE employer_accounts
      SET onboardings_used = onboardings_used + 1
      WHERE id = p_employer_id;
    RETURN true;
  ELSIF v_credits > 0 THEN
    UPDATE employer_accounts
      SET onboardings_used = onboardings_used + 1,
          paid_credits = paid_credits - 1
      WHERE id = p_employer_id;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- 4. Billing state helper for the dashboard usage counter
CREATE OR REPLACE FUNCTION get_billing_state(p_employer_id uuid)
RETURNS TABLE (onboardings_used integer, free_limit integer, paid_credits integer, can_start boolean)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    ea.onboardings_used,
    3 AS free_limit,
    ea.paid_credits,
    (ea.onboardings_used < 3 OR ea.paid_credits > 0) AS can_start
  FROM employer_accounts ea
  WHERE ea.id = p_employer_id;
$$;
