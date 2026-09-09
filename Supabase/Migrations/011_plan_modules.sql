-- ============================================================================
-- Migration 011: Pricing becomes two modules on one size axis
-- Run in Supabase SQL Editor after 010. Safe to re-run.
--
-- WHY
--   The 010 model was three ascending tiers (free / onboard / comply) where
--   "comply" silently contained "onboard", priced on two different units
--   (onboard flat, comply banded). Customers could not tell which they
--   needed, and anyone who wanted compliance WITHOUT onboarding had to buy
--   onboarding anyway.
--
-- NEW MODEL
--   Two products, one size axis. Pick either or both, priced by headcount.
--     free        3 onboardings total
--     onboarding  unlimited new-starter onboarding
--     compliance  workforce records + expiry tracking
--     complete    both, at a discount
--     custom      over 200 people or bespoke; set by hand
--
--   Bands change from 25 / 75 / 200 to 25 / 50 / 100 / 200. The extra band
--   softens the price jump that used to hit anyone crossing 25 people.
--
--   Prices live ONLY in lib/plans.ts. Nothing to create in Stripe.
-- ============================================================================


-- ============================================================================
-- 1. WIDEN THE CHECK CONSTRAINTS
--    010 created these inline, so Postgres named them <table>_<column>_check.
--    The DO block drops them by definition text as well, in case a project
--    ended up with a different name.
-- ============================================================================
DO $constraints$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'employer_accounts'
      AND con.contype = 'c'
      AND (pg_get_constraintdef(con.oid) LIKE '%plan_tier%'
        OR pg_get_constraintdef(con.oid) LIKE '%plan_band%')
  LOOP
    EXECUTE format('ALTER TABLE employer_accounts DROP CONSTRAINT %I', r.conname);
  END LOOP;
END;
$constraints$;


-- ============================================================================
-- 2. MIGRATE ANY EXISTING VALUES
--    Nobody should be on a paid plan yet, but map the retired names rather
--    than leave a row that fails the new constraint.
--      onboard -> onboarding, comply -> complete (comply included onboarding)
--      band 75 -> 100 (the nearest band that still covers those people)
-- ============================================================================
UPDATE employer_accounts SET plan_tier = 'onboarding' WHERE plan_tier = 'onboard';
UPDATE employer_accounts SET plan_tier = 'complete'   WHERE plan_tier = 'comply';
UPDATE employer_accounts SET plan_band = '100'        WHERE plan_band = '75';


-- ============================================================================
-- 3. THE NEW CONSTRAINTS
-- ============================================================================
ALTER TABLE employer_accounts
  ADD CONSTRAINT employer_accounts_plan_tier_check
  CHECK (plan_tier IN ('free', 'onboarding', 'compliance', 'complete', 'custom'));

ALTER TABLE employer_accounts
  ADD CONSTRAINT employer_accounts_plan_band_check
  CHECK (plan_band IS NULL OR plan_band IN ('25', '50', '100', '200'));


-- ============================================================================
-- 4. ENTITLEMENT FUNCTION
--    Must stay in step with entitlementsFor() in lib/plans.ts. Note that the
--    compliance-only tier does NOT grant unlimited onboarding: those
--    customers did not buy it, so they fall back to the free limit and
--    per-hire credits.
-- ============================================================================
CREATE OR REPLACE FUNCTION plan_has_unlimited_onboarding(p_tier TEXT, p_status TEXT)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_tier = 'custom'
      OR (p_tier IN ('onboarding', 'complete') AND p_status IN ('active', 'trialing', 'past_due'));
$$;

GRANT EXECUTE ON FUNCTION plan_has_unlimited_onboarding(TEXT, TEXT) TO authenticated, service_role;
