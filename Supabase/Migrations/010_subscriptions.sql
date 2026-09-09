-- ============================================================================
-- Migration 010: Subscription plans (tiered by feature and headcount)
-- Run in Supabase SQL Editor after 009. Safe to re-run.
--
-- PLAN MODEL (see lib/plans.ts for prices and feature flags)
--   free     first 3 onboardings free, no compliance features
--   onboard  flat monthly price, unlimited onboardings, no compliance
--   comply   headcount-banded monthly price (25 / 75 / 200), unlimited
--            onboardings + workforce + compliance tracking
--   custom   over 200 people or negotiated; set manually, no Stripe gate
--
-- subscription_status (existing column) now carries Stripe's state:
--   trial (legacy default = free tier) | trialing | active | past_due |
--   cancelled | unpaid
-- ============================================================================

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'subscription_updated';

ALTER TABLE employer_accounts
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (plan_tier IN ('free', 'onboard', 'comply', 'custom')),
  ADD COLUMN IF NOT EXISTS plan_band TEXT
    CHECK (plan_band IS NULL OR plan_band IN ('25', '75', '200')),
  ADD COLUMN IF NOT EXISTS plan_interval TEXT
    CHECK (plan_interval IS NULL OR plan_interval IN ('month', 'year')),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_employer_accounts_subscription ON employer_accounts(stripe_subscription_id);

-- A paid plan in good standing gets unlimited onboardings. past_due is still
-- allowed (Stripe retries for days); cancelled/unpaid fall back to credits.
CREATE OR REPLACE FUNCTION plan_has_unlimited_onboarding(p_tier TEXT, p_status TEXT)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_tier = 'custom'
      OR (p_tier IN ('onboard', 'comply') AND p_status IN ('active', 'trialing', 'past_due'));
$$;

CREATE OR REPLACE FUNCTION consume_onboarding_slot(p_employer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_free_limit constant integer := 3;
  v_used integer;
  v_credits integer;
  v_tier text;
  v_status text;
BEGIN
  SELECT onboardings_used, paid_credits, plan_tier, subscription_status
    INTO v_used, v_credits, v_tier, v_status
    FROM employer_accounts
    WHERE id = p_employer_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF plan_has_unlimited_onboarding(v_tier, v_status) THEN
    UPDATE employer_accounts SET onboardings_used = onboardings_used + 1 WHERE id = p_employer_id;
    RETURN true;
  ELSIF v_used < v_free_limit THEN
    UPDATE employer_accounts SET onboardings_used = onboardings_used + 1 WHERE id = p_employer_id;
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

CREATE OR REPLACE FUNCTION get_billing_state(p_employer_id uuid)
RETURNS TABLE (onboardings_used integer, free_limit integer, paid_credits integer, can_start boolean)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    ea.onboardings_used,
    3 AS free_limit,
    ea.paid_credits,
    (plan_has_unlimited_onboarding(ea.plan_tier, ea.subscription_status)
      OR ea.onboardings_used < 3
      OR ea.paid_credits > 0) AS can_start
  FROM employer_accounts ea
  WHERE ea.id = p_employer_id;
$$;

GRANT EXECUTE ON FUNCTION plan_has_unlimited_onboarding(TEXT, TEXT) TO authenticated, service_role;
