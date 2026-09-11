-- ============================================================================
-- Migration 013: Corporate and professional services sector
-- Run in Supabase SQL Editor after 012. Safe to re-run.
--
-- WHY
--   The five sectors were all frontline: care, construction, hospitality,
--   logistics, security. An accountancy practice, agency, consultancy or
--   software firm had to pick "Something else" and got the generic list with
--   no sector of their own.
--
--   Office-based employers do have a real compliance set, it is simply a
--   different one. Display screen assessments, fire marshals, data protection
--   and cyber awareness, grey fleet driving checks for people using their own
--   cars on business, the annual ICO fee, and for regulated professions the
--   anti-money-laundering and anti-bribery training that nobody else needs.
--
-- WHAT THIS DOES
--   1. Allows 'corporate' as a sector on employer_accounts.
--   2. Tags the existing library rows that genuinely apply to an office.
--   3. Adds two requirements the library was missing entirely, both of which
--      are squarely corporate: AML and anti-bribery training.
-- ============================================================================


-- ============================================================================
-- 1. ALLOW THE NEW SECTOR
--    Rebuilt rather than altered, since a CHECK constraint cannot be extended
--    in place. Dropped by definition text so a differently-named constraint on
--    any given project is still caught.
-- ============================================================================
DO $sector_check$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'employer_accounts'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%sector%'
      AND pg_get_constraintdef(con.oid) NOT LIKE '%plan_%'
  LOOP
    EXECUTE format('ALTER TABLE employer_accounts DROP CONSTRAINT %I', r.conname);
  END LOOP;
END;
$sector_check$;

ALTER TABLE employer_accounts
  ADD CONSTRAINT employer_accounts_sector_check
  CHECK (sector IS NULL OR sector IN ('care', 'construction', 'hospitality', 'logistics', 'security', 'corporate', 'other'));


-- ============================================================================
-- 2. TAG THE LIBRARY
--    Only what an office employer would actually recognise. Manual handling,
--    COSHH, health surveillance and safeguarding are deliberately left out:
--    an accountancy practice ticking those would be noise, and anything
--    missing can still be enabled by hand from Compliance settings.
-- ============================================================================
UPDATE compliance_requirement_types
SET sectors = array_append(sectors, 'corporate')
WHERE employer_id IS NULL
  AND NOT ('corporate' = ANY(sectors))
  AND code IN (
    -- People and employment
    'right_to_work_followup',
    'sponsored_worker_visa',
    'probation_end',
    'fixed_term_contract_end',
    'appraisal',
    -- Health and safety as it actually applies to an office
    'first_aid_at_work',
    'fire_marshal',
    'fire_safety_awareness',
    'mental_health_first_aider',
    'iosh_managing_safely',
    'induction_hs',
    'dse_assessment',
    -- Conduct, data and security
    'sexual_harassment_prevention',
    'equality_diversity',
    'data_protection_training',
    'cyber_security_awareness',
    -- Anyone driving their own car on business
    'driving_licence_check',
    -- Regulated roles and vetting
    'professional_registration',
    'dbs_check',
    'dbs_update_service',
    -- Organisation level
    'org_employers_liability',
    'org_fire_risk_assessment',
    'org_hs_policy_review',
    'org_legionella_risk_assessment',
    'org_pat_testing',
    'org_ico_fee',
    'org_cyber_essentials',
    'org_sponsor_licence'
  );


-- ============================================================================
-- 3. TWO REQUIREMENTS THE LIBRARY WAS MISSING
--    Both are obligations that fall hardest on exactly the firms this sector
--    is for: accountants, estate agents, legal, finance and consultancies.
-- ============================================================================
INSERT INTO compliance_requirement_types
  (code, name, category, sectors, subject, renewal_rule, default_interval_months, interval_locked, work_blocking, evidence_required, reference_label, captures, statutory_basis, description, guidance, sort_order)
VALUES

('aml_training', 'Anti-money laundering training', 'training', '{corporate}', 'person', 'employer_interval', 12, false, false, true, NULL, '{}',
 'Money Laundering, Terrorist Financing and Transfer of Funds Regulations 2017, reg 24',
 'Required for anyone in a regulated sector: accountancy, legal, estate agency, financial services, high value dealers. The regulations require training to be ongoing, and supervisors expect to see it repeated annually with a record of who attended.',
 'Upload your AML training certificate or completion record.', 36),

('anti_bribery_training', 'Anti-bribery and corruption training', 'training', '{corporate}', 'person', 'employer_interval', 24, false, false, true, NULL, '{}',
 'Bribery Act 2010, s.7 adequate procedures defence',
 'Training is one of the six principles behind the adequate procedures defence. If an employee ever bribes someone on your behalf, being able to show current training is a large part of what protects the company.',
 'Upload your completion record.', 37)

ON CONFLICT (code) WHERE employer_id IS NULL DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  sectors = EXCLUDED.sectors,
  subject = EXCLUDED.subject,
  renewal_rule = EXCLUDED.renewal_rule,
  default_interval_months = EXCLUDED.default_interval_months,
  interval_locked = EXCLUDED.interval_locked,
  work_blocking = EXCLUDED.work_blocking,
  evidence_required = EXCLUDED.evidence_required,
  statutory_basis = EXCLUDED.statutory_basis,
  description = EXCLUDED.description,
  guidance = EXCLUDED.guidance,
  sort_order = EXCLUDED.sort_order;


-- ============================================================================
-- 4. CHECK
--    Expect a healthy count for corporate and 96 rows in the library overall.
-- ============================================================================
-- select count(*) from compliance_requirement_types
--   where employer_id is null and 'corporate' = any(sectors);
