-- ============================================================================
-- Migration 009: Workforce + compliance tracking
-- Run in Supabase SQL Editor. Safe to re-run (IF NOT EXISTS / ON CONFLICT).
--
-- WHAT THIS ADDS
--   employments                    the workforce: who currently works here
--   compliance_requirement_types   the requirement library (system + custom)
--   employer_requirements          which requirements THIS employer enforces
--   role_groups (+ 2 join tables)  scope a requirement to "Drivers", "Kitchen"
--   compliance_records             one row per person per requirement per cycle
--   compliance_hours_log           Driver CPC periodic-training hours
--   compliance_notifications_sent  dedupe for reminder emails
--   compliance-evidence bucket     employer-scoped evidence storage
--
-- DESIGN DECISIONS
--   * Compliance records are EMPLOYER-CONTROLLED data (training/licence
--     records the employer must hold by law), not part of the employee's
--     portable profile. They live under employer_id, in their own bucket,
--     and are NOT gated by consent_records. Lawful basis is legal obligation
--     / legitimate interest, not consent.
--   * A person can exist in the workforce with no Vopria account
--     (employee_id NULL) so an employer can load existing staff by CSV.
--   * Status (valid / expiring / expired ...) is DERIVED in application code
--     (lib/compliance/engine.ts) from expires_at + lead days. It is never
--     stored, so it cannot drift.
--   * Renewal rules use TEXT + CHECK rather than enums so new rules can be
--     added without ALTER TYPE.
-- ============================================================================


-- ============================================================================
-- 1. AUDIT ACTIONS
-- ============================================================================
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'employment_created';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'employment_updated';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'employment_ended';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'workforce_imported';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'workforce_invite_sent';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'workforce_invite_accepted';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'compliance_requirement_updated';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'compliance_record_created';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'compliance_record_verified';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'compliance_record_rejected';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'compliance_record_exempted';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'compliance_record_deleted';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'compliance_reminder_sent';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'compliance_escalation_sent';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'compliance_evidence_viewed';


-- ============================================================================
-- 1b. updated_at HELPER
--     001 creates the moddatetime extension but never actually uses it in a
--     trigger, so which schema it landed in is unproven -- a bare
--     moddatetime(updated_at) reference in CREATE TRIGGER fails outright if
--     the extension is not on the current search_path. This local function
--     removes the dependency entirely.
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $set_updated_at$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$set_updated_at$;

GRANT EXECUTE ON FUNCTION set_updated_at() TO authenticated, service_role;


-- ============================================================================
-- 2. EMPLOYER SECTOR (drives the default library selection)
-- ============================================================================
ALTER TABLE employer_accounts
  ADD COLUMN IF NOT EXISTS sector TEXT
  CHECK (sector IS NULL OR sector IN ('care', 'construction', 'hospitality', 'logistics', 'security', 'other'));


-- ============================================================================
-- 3. EMPLOYMENTS (the workforce)
-- ============================================================================
CREATE TABLE IF NOT EXISTS employments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id           UUID NOT NULL REFERENCES employer_accounts(id) ON DELETE CASCADE,
  employee_id           UUID REFERENCES employee_profiles(id) ON DELETE SET NULL,  -- NULL until they have/claim an account
  source_onboarding_id  UUID REFERENCES onboarding_instances(id) ON DELETE SET NULL,

  full_name             TEXT NOT NULL,
  email                 TEXT,                       -- lower-cased; NULL allowed for people with no email
  job_title             TEXT,
  department            TEXT,
  date_of_birth         DATE,                       -- needed for age-based rules (driver medical)
  start_date            DATE,
  end_date              DATE,
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'leaver')),

  -- Magic-link claim so a CSV-imported person can get self-service access
  invitation_token      UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  invited_at            TIMESTAMPTZ,

  created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_employments_employer ON employments(employer_id, status);
CREATE INDEX IF NOT EXISTS idx_employments_employee ON employments(employee_id);
-- One ACTIVE record per email per employer; leavers can be re-hired later.
CREATE UNIQUE INDEX IF NOT EXISTS uq_employments_active_email
  ON employments(employer_id, lower(email)) WHERE status = 'active' AND email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_employments_active_employee
  ON employments(employer_id, employee_id) WHERE status = 'active' AND employee_id IS NOT NULL;

DROP TRIGGER IF EXISTS employments_updated_at ON employments;
CREATE TRIGGER employments_updated_at
  BEFORE UPDATE ON employments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE employments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employments_select" ON employments;
CREATE POLICY "employments_select" ON employments
  FOR SELECT USING (
    employer_id = get_my_employer_id()
    OR (employee_id IS NOT NULL AND employee_id = get_my_employee_id())
  );

DROP POLICY IF EXISTS "employments_insert" ON employments;
CREATE POLICY "employments_insert" ON employments
  FOR INSERT WITH CHECK (employer_id = get_my_employer_id());

DROP POLICY IF EXISTS "employments_update" ON employments;
CREATE POLICY "employments_update" ON employments
  FOR UPDATE USING (employer_id = get_my_employer_id());

DROP POLICY IF EXISTS "employments_delete" ON employments;
CREATE POLICY "employments_delete" ON employments
  FOR DELETE USING (employer_id = get_my_employer_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON employments TO authenticated, service_role;


-- Auto-create an employment when an onboarding is completed. If the employer
-- already loaded this person by CSV (same email, no account yet), link the
-- existing row instead of creating a duplicate.
CREATE OR REPLACE FUNCTION create_employment_from_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dob DATE;
BEGIN
  IF NEW.status = 'complete'
     AND (OLD.status IS DISTINCT FROM 'complete')
     AND NEW.employee_id IS NOT NULL THEN

    SELECT date_of_birth INTO v_dob FROM employee_profiles WHERE id = NEW.employee_id;

    UPDATE employments
       SET employee_id = NEW.employee_id,
           source_onboarding_id = COALESCE(source_onboarding_id, NEW.id),
           job_title = COALESCE(job_title, NEW.role_title),
           start_date = COALESCE(start_date, NEW.start_date),
           date_of_birth = COALESCE(date_of_birth, v_dob)
     WHERE employer_id = NEW.employer_id
       AND status = 'active'
       AND employee_id IS NULL
       AND email IS NOT NULL
       AND lower(email) = lower(NEW.invitee_email);

    IF NOT FOUND THEN
      INSERT INTO employments (employer_id, employee_id, source_onboarding_id, full_name, email, job_title, start_date, date_of_birth, status)
      VALUES (NEW.employer_id, NEW.employee_id, NEW.id, NEW.invitee_name, lower(NEW.invitee_email), NEW.role_title, NEW.start_date, v_dob, 'active')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS onboarding_complete_creates_employment ON onboarding_instances;
CREATE TRIGGER onboarding_complete_creates_employment
  AFTER UPDATE OF status ON onboarding_instances
  FOR EACH ROW EXECUTE FUNCTION create_employment_from_onboarding();

-- Backfill: every already-complete onboarding becomes an active employment.
INSERT INTO employments (employer_id, employee_id, source_onboarding_id, full_name, email, job_title, start_date, date_of_birth, status)
SELECT oi.employer_id, oi.employee_id, oi.id, oi.invitee_name, lower(oi.invitee_email), oi.role_title, oi.start_date, ep.date_of_birth, 'active'
FROM onboarding_instances oi
LEFT JOIN employee_profiles ep ON ep.id = oi.employee_id
WHERE oi.status = 'complete'
  AND oi.employee_id IS NOT NULL
  AND oi.data_purged_at IS NULL
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 4. REQUIREMENT LIBRARY
-- ============================================================================
CREATE TABLE IF NOT EXISTS compliance_requirement_types (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id             UUID REFERENCES employer_accounts(id) ON DELETE CASCADE,  -- NULL = system library row
  code                    TEXT,                                                      -- stable key for system rows

  name                    TEXT NOT NULL,
  description             TEXT,                       -- employer-facing: what it is, why it matters
  guidance                TEXT,                       -- employee-facing: what to upload
  statutory_basis         TEXT,                       -- citation shown in copy

  category                TEXT NOT NULL CHECK (category IN ('training', 'licence', 'check', 'registration', 'medical', 'screening', 'hr_event')),
  sectors                 TEXT[] NOT NULL DEFAULT '{cross_sector}',
  subject                 TEXT NOT NULL DEFAULT 'person' CHECK (subject IN ('person', 'organisation')),

  -- How the next due date is worked out. See lib/compliance/engine.ts.
  --   fixed_interval     issued_at + interval; interval locked by statute
  --   employer_interval  issued_at + interval; employer may override
  --   document_date      the expiry printed on the document
  --   no_expiry          one-off; valid once evidenced
  --   age_based          driver medical: 45th birthday, then 5-yearly to 65, then annual
  --   status_check       DBS Update Service etc: last_checked_at + interval
  --   event_based        expires on a date tied to an event (project end)
  renewal_rule            TEXT NOT NULL CHECK (renewal_rule IN ('fixed_interval', 'employer_interval', 'document_date', 'no_expiry', 'age_based', 'status_check', 'event_based')),
  default_interval_months INT,
  interval_locked         BOOLEAN NOT NULL DEFAULT false,

  work_blocking           BOOLEAN NOT NULL DEFAULT false,   -- expired = cannot legally/safely work
  evidence_required       BOOLEAN NOT NULL DEFAULT true,
  reference_label         TEXT,                             -- e.g. "Card number"
  captures                JSONB NOT NULL DEFAULT '{}'::jsonb, -- extra fields: {"variant":["national","international"],"hours":true}

  sort_order              INT NOT NULL DEFAULT 0,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_requirement_types_system_code
  ON compliance_requirement_types(code) WHERE employer_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_requirement_types_employer ON compliance_requirement_types(employer_id);

ALTER TABLE compliance_requirement_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requirement_types_select" ON compliance_requirement_types;
CREATE POLICY "requirement_types_select" ON compliance_requirement_types
  FOR SELECT USING (employer_id IS NULL OR employer_id = get_my_employer_id());

DROP POLICY IF EXISTS "requirement_types_insert" ON compliance_requirement_types;
CREATE POLICY "requirement_types_insert" ON compliance_requirement_types
  FOR INSERT WITH CHECK (employer_id = get_my_employer_id());

DROP POLICY IF EXISTS "requirement_types_update" ON compliance_requirement_types;
CREATE POLICY "requirement_types_update" ON compliance_requirement_types
  FOR UPDATE USING (employer_id = get_my_employer_id());

DROP POLICY IF EXISTS "requirement_types_delete" ON compliance_requirement_types;
CREATE POLICY "requirement_types_delete" ON compliance_requirement_types
  FOR DELETE USING (employer_id = get_my_employer_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_requirement_types TO authenticated, service_role;


-- ============================================================================
-- 5. EMPLOYER REQUIREMENT CONFIG + ROLE GROUPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_groups (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id   UUID NOT NULL REFERENCES employer_accounts(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (employer_id, name)
);

CREATE TABLE IF NOT EXISTS employer_requirements (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id               UUID NOT NULL REFERENCES employer_accounts(id) ON DELETE CASCADE,
  requirement_type_id       UUID NOT NULL REFERENCES compliance_requirement_types(id) ON DELETE CASCADE,
  enabled                   BOOLEAN NOT NULL DEFAULT true,
  interval_months_override  INT,                                  -- only honoured when the type is not interval_locked
  reminder_lead_days        INT[] NOT NULL DEFAULT '{90,30,7}',
  applies_to                TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'role_groups')),
  created_at                TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at                TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (employer_id, requirement_type_id)
);

CREATE TABLE IF NOT EXISTS employer_requirement_role_groups (
  employer_requirement_id UUID NOT NULL REFERENCES employer_requirements(id) ON DELETE CASCADE,
  role_group_id           UUID NOT NULL REFERENCES role_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (employer_requirement_id, role_group_id)
);

CREATE TABLE IF NOT EXISTS employment_role_groups (
  employment_id   UUID NOT NULL REFERENCES employments(id) ON DELETE CASCADE,
  role_group_id   UUID NOT NULL REFERENCES role_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (employment_id, role_group_id)
);

CREATE INDEX IF NOT EXISTS idx_employer_requirements_employer ON employer_requirements(employer_id, enabled);

DROP TRIGGER IF EXISTS employer_requirements_updated_at ON employer_requirements;
CREATE TRIGGER employer_requirements_updated_at
  BEFORE UPDATE ON employer_requirements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE role_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_requirement_role_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_role_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_groups_all" ON role_groups;
CREATE POLICY "role_groups_all" ON role_groups
  FOR ALL USING (employer_id = get_my_employer_id()) WITH CHECK (employer_id = get_my_employer_id());

DROP POLICY IF EXISTS "employer_requirements_all" ON employer_requirements;
CREATE POLICY "employer_requirements_all" ON employer_requirements
  FOR ALL USING (employer_id = get_my_employer_id()) WITH CHECK (employer_id = get_my_employer_id());

-- Employees need to read which requirements apply to them.
DROP POLICY IF EXISTS "employer_requirements_select_employee" ON employer_requirements;
CREATE POLICY "employer_requirements_select_employee" ON employer_requirements
  FOR SELECT USING (
    employer_id IN (SELECT employer_id FROM employments WHERE employee_id = get_my_employee_id())
  );

DROP POLICY IF EXISTS "err_all" ON employer_requirement_role_groups;
CREATE POLICY "err_all" ON employer_requirement_role_groups
  FOR ALL USING (
    employer_requirement_id IN (SELECT id FROM employer_requirements WHERE employer_id = get_my_employer_id())
  ) WITH CHECK (
    employer_requirement_id IN (SELECT id FROM employer_requirements WHERE employer_id = get_my_employer_id())
  );

DROP POLICY IF EXISTS "erg_all" ON employment_role_groups;
CREATE POLICY "erg_all" ON employment_role_groups
  FOR ALL USING (
    employment_id IN (SELECT id FROM employments WHERE employer_id = get_my_employer_id())
  ) WITH CHECK (
    employment_id IN (SELECT id FROM employments WHERE employer_id = get_my_employer_id())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON role_groups, employer_requirements, employer_requirement_role_groups, employment_role_groups TO authenticated, service_role;


-- ============================================================================
-- 6. COMPLIANCE RECORDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS compliance_records (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id               UUID NOT NULL REFERENCES employer_accounts(id) ON DELETE CASCADE,
  employment_id             UUID REFERENCES employments(id) ON DELETE CASCADE,   -- NULL for organisation-level records
  employer_requirement_id   UUID NOT NULL REFERENCES employer_requirements(id) ON DELETE CASCADE,

  -- Dates. Which ones matter depends on the type's renewal_rule.
  issued_at                 DATE,        -- completion / issue date
  expires_at                DATE,        -- computed by the engine or entered from the document
  last_checked_at           DATE,        -- status_check rule (DBS Update Service, licence checks)

  -- Evidence (compliance-evidence bucket, path {employer_id}/{employment_id|org}/...)
  document_path             TEXT,
  document_name             TEXT,
  reference_encrypted       TEXT,        -- card / licence / certificate number, AES-256-GCM via lib/encryption
  attributes                JSONB NOT NULL DEFAULT '{}'::jsonb,  -- variant, level, medical type, provider, notes...

  -- Review. Employer-entered records are verified immediately; employee
  -- uploads start as pending until an employer member checks them.
  verification_status       TEXT NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_by               UUID REFERENCES auth.users(id),
  verified_at               TIMESTAMPTZ,
  reviewer_notes            TEXT,

  is_exempt                 BOOLEAN NOT NULL DEFAULT false,
  exempt_reason             TEXT,

  -- History: renewing creates a new current row and points the old one here.
  is_current                BOOLEAN NOT NULL DEFAULT true,
  superseded_by             UUID REFERENCES compliance_records(id) ON DELETE SET NULL,

  submitted_by              TEXT NOT NULL DEFAULT 'employer' CHECK (submitted_by IN ('employer', 'employee')),
  created_by                UUID REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at                TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_compliance_records_lookup
  ON compliance_records(employment_id, employer_requirement_id) WHERE is_current;
CREATE INDEX IF NOT EXISTS idx_compliance_records_employer
  ON compliance_records(employer_id) WHERE is_current;
CREATE INDEX IF NOT EXISTS idx_compliance_records_expiry
  ON compliance_records(expires_at) WHERE is_current;

DROP TRIGGER IF EXISTS compliance_records_updated_at ON compliance_records;
CREATE TRIGGER compliance_records_updated_at
  BEFORE UPDATE ON compliance_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE compliance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_records_select" ON compliance_records;
CREATE POLICY "compliance_records_select" ON compliance_records
  FOR SELECT USING (
    employer_id = get_my_employer_id()
    OR employment_id IN (SELECT id FROM employments WHERE employee_id = get_my_employee_id())
  );

DROP POLICY IF EXISTS "compliance_records_insert" ON compliance_records;
CREATE POLICY "compliance_records_insert" ON compliance_records
  FOR INSERT WITH CHECK (
    employer_id = get_my_employer_id()
    OR (
      submitted_by = 'employee'
      AND employment_id IN (SELECT id FROM employments WHERE employee_id = get_my_employee_id())
    )
  );

DROP POLICY IF EXISTS "compliance_records_update" ON compliance_records;
CREATE POLICY "compliance_records_update" ON compliance_records
  FOR UPDATE USING (employer_id = get_my_employer_id());

DROP POLICY IF EXISTS "compliance_records_delete" ON compliance_records;
CREATE POLICY "compliance_records_delete" ON compliance_records
  FOR DELETE USING (employer_id = get_my_employer_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_records TO authenticated, service_role;


-- Driver CPC periodic training hours (35 hours per 5-year cycle).
CREATE TABLE IF NOT EXISTS compliance_hours_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id       UUID NOT NULL REFERENCES compliance_records(id) ON DELETE CASCADE,
  course_name     TEXT NOT NULL,
  hours           NUMERIC(4,1) NOT NULL CHECK (hours > 0 AND hours <= 35),
  completed_on    DATE NOT NULL,
  provider        TEXT,
  document_path   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hours_log_record ON compliance_hours_log(record_id);
ALTER TABLE compliance_hours_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hours_log_select" ON compliance_hours_log;
CREATE POLICY "hours_log_select" ON compliance_hours_log
  FOR SELECT USING (
    record_id IN (
      SELECT id FROM compliance_records
      WHERE employer_id = get_my_employer_id()
         OR employment_id IN (SELECT id FROM employments WHERE employee_id = get_my_employee_id())
    )
  );

DROP POLICY IF EXISTS "hours_log_write" ON compliance_hours_log;
CREATE POLICY "hours_log_write" ON compliance_hours_log
  FOR ALL USING (
    record_id IN (SELECT id FROM compliance_records WHERE employer_id = get_my_employer_id())
  ) WITH CHECK (
    record_id IN (SELECT id FROM compliance_records WHERE employer_id = get_my_employer_id())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_hours_log TO authenticated, service_role;


-- Reminder dedupe. kind + key is unique: e.g. ('employee_reminder', '<record_id>:30')
CREATE TABLE IF NOT EXISTS compliance_notifications_sent (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id   UUID NOT NULL REFERENCES employer_accounts(id) ON DELETE CASCADE,
  record_id     UUID REFERENCES compliance_records(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,
  key           TEXT NOT NULL,
  sent_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (kind, key)
);

ALTER TABLE compliance_notifications_sent ENABLE ROW LEVEL SECURITY;
-- Written only by the cron via service role; employers may read their own.
DROP POLICY IF EXISTS "notifications_sent_select" ON compliance_notifications_sent;
CREATE POLICY "notifications_sent_select" ON compliance_notifications_sent
  FOR SELECT USING (employer_id = get_my_employer_id());

GRANT SELECT ON compliance_notifications_sent TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_notifications_sent TO service_role;


-- ============================================================================
-- 7. EVIDENCE BUCKET
--    Private. All uploads go through signed upload URLs minted server-side
--    after an ownership check, and all reads through signed URLs, so no
--    storage.objects policies are needed (signed URLs bypass RLS).
-- ============================================================================
--    Wrapped in an exception handler on purpose: creating a bucket needs
--    rights on storage.buckets that vary between Supabase projects, and this
--    whole migration runs as ONE transaction in the SQL editor. Without the
--    handler, a permission error here would roll back all 9 tables and the
--    entire requirement library over a peripheral step. If this raises the
--    notice below, create the bucket by hand in Dashboard -> Storage:
--      name compliance-evidence, Private, 10485760 bytes,
--      MIME types application/pdf, image/jpeg, image/png
DO $bucket$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('compliance-evidence', 'compliance-evidence', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
  ON CONFLICT (id) DO NOTHING;
  RAISE NOTICE 'compliance-evidence bucket present';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create the compliance-evidence bucket (%). Create it manually in Dashboard -> Storage. Everything else in this migration still applied.', SQLERRM;
END;
$bucket$;


-- ============================================================================
-- 8. SYSTEM LIBRARY SEED
--    Re-runnable: ON CONFLICT updates copy/cadence for existing codes.
--    Cadences: "locked" = set by statute or the issuing body (CSCS 5 yrs);
--    unlocked = convention the employer may override (food hygiene 3 yrs).
-- ============================================================================
INSERT INTO compliance_requirement_types
  (code, name, category, sectors, subject, renewal_rule, default_interval_months, interval_locked, work_blocking, evidence_required, reference_label, captures, statutory_basis, description, guidance, sort_order)
VALUES

-- ── Cross-sector: statutory HR and H&S ───────────────────────────────────────
('right_to_work_followup', 'Right to work follow-up check', 'check', '{cross_sector,care,construction,hospitality,logistics,security}', 'person', 'document_date', NULL, true, true, true, 'Share code or document reference', '{}',
 'Immigration, Asylum and Nationality Act 2006; Home Office right to work guidance',
 'For anyone with time-limited permission to work, a repeat check is due before their current permission expires. Enter the expiry date of their visa, BRP or eVisa.',
 'Provide a new GOV.UK share code or a photo of your current visa or BRP showing the expiry date.', 10),

('sponsored_worker_visa', 'Sponsored worker visa (Certificate of Sponsorship)', 'check', '{cross_sector,care,construction,hospitality,logistics}', 'person', 'document_date', NULL, true, true, true, 'CoS reference', '{}',
 'Immigration Rules; Workers and Temporary Workers sponsor guidance Part 3 (report changes within 10 working days)',
 'Track visa expiry for sponsored workers. Sponsor duties require you to report changes within 10 working days, so keep this date and the contract end aligned.',
 'Provide a photo of your visa, BRP or eVisa share code showing the expiry date.', 11),

('probation_end', 'Probation period end', 'hr_event', '{cross_sector,care,construction,hospitality,logistics,security}', 'person', 'document_date', NULL, true, false, false, NULL, '{}',
 'Contractual; ACAS guidance',
 'Enter the date probation ends so the review does not get missed. No evidence needed.',
 NULL, 12),

('fixed_term_contract_end', 'Fixed-term or visa-linked contract end', 'hr_event', '{cross_sector,care,construction,hospitality,logistics,security}', 'person', 'document_date', NULL, true, false, false, NULL, '{}',
 'Fixed-term Employees Regulations 2002',
 'Track when a fixed-term contract ends so renewal, extension or a fair ending is planned in time.',
 NULL, 13),

('first_aid_at_work', 'First aid at work (FAW)', 'training', '{cross_sector,care,construction,hospitality,logistics,security}', 'person', 'fixed_interval', 36, true, false, true, 'Certificate number', '{}',
 'Health and Safety (First-Aid) Regulations 1981; HSE L74',
 'Three-day FAW certificate. Valid for three years. HSE recommends an annual refresher but it is not mandatory.',
 'Upload your FAW certificate showing the date it was issued.', 20),

('emergency_first_aid', 'Emergency first aid at work (EFAW)', 'training', '{cross_sector,construction,hospitality,logistics}', 'person', 'fixed_interval', 36, true, false, true, 'Certificate number', '{}',
 'Health and Safety (First-Aid) Regulations 1981',
 'One-day EFAW certificate, valid three years.',
 'Upload your EFAW certificate showing the date it was issued.', 21),

('fire_marshal', 'Fire marshal / fire warden', 'training', '{cross_sector,care,construction,hospitality,logistics,security}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'Regulatory Reform (Fire Safety) Order 2005, art. 21',
 'Nominated fire marshals. Three years by convention; set your own interval.',
 'Upload your fire marshal training certificate.', 22),

('fire_safety_awareness', 'Fire safety and evacuation training', 'training', '{cross_sector,care,hospitality,logistics}', 'person', 'employer_interval', 12, false, false, true, NULL, '{}',
 'Regulatory Reform (Fire Safety) Order 2005, art. 21',
 'All staff. Annual refresher is the accepted standard and what a fire officer or CQC inspector expects to see.',
 'Upload your fire safety training certificate or e-learning completion record.', 23),

('mental_health_first_aider', 'Mental health first aider', 'training', '{cross_sector,care,construction,hospitality,logistics,security}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'MHFA England recommends a refresher every three years',
 'Nominated mental health first aiders. Three-year refresher is the MHFA England recommendation.',
 'Upload your MHFA certificate.', 24),

('iosh_managing_safely', 'IOSH Managing Safely', 'training', '{cross_sector,construction,logistics,hospitality}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'IOSH recommends a refresher every three years',
 'Managers and supervisors. Three-year refresher recommended.',
 'Upload your IOSH certificate.', 25),

('induction_hs', 'Health and safety induction', 'training', '{cross_sector,care,construction,hospitality,logistics,security}', 'person', 'no_expiry', NULL, true, false, true, NULL, '{}',
 'Health and Safety at Work etc. Act 1974 s.2; Management Regulations 1999 reg 13',
 'One-off induction on joining. Record the date it was completed.',
 'Upload or confirm your induction completion record.', 26),

('manual_handling', 'Manual handling', 'training', '{cross_sector,construction,hospitality,logistics}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'Manual Handling Operations Regulations 1992',
 'General manual handling for goods and loads. Three years by convention. Care staff need the separate moving and handling of people item.',
 'Upload your manual handling training certificate.', 27),

('dse_assessment', 'DSE workstation assessment', 'check', '{cross_sector,care,hospitality,logistics,security}', 'person', 'employer_interval', 12, false, false, false, NULL, '{}',
 'Health and Safety (Display Screen Equipment) Regulations 1992',
 'Screen users. Assess on set-up and review when anything changes; an annual review is the common standard.',
 'Complete your DSE self-assessment when asked.', 28),

('coshh_training', 'COSHH awareness', 'training', '{cross_sector,care,construction,hospitality,logistics}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'Control of Substances Hazardous to Health Regulations 2002, reg 12',
 'Anyone using hazardous substances, including cleaning chemicals.',
 'Upload your COSHH training certificate.', 29),

('sexual_harassment_prevention', 'Preventing sexual harassment at work', 'training', '{cross_sector,care,construction,hospitality,logistics,security}', 'person', 'employer_interval', 12, false, false, true, NULL, '{}',
 'Worker Protection (Amendment of Equality Act 2010) Act 2023, in force 26 October 2024',
 'Employers now have a positive duty to take reasonable steps to prevent sexual harassment. Refresher training is the evidence a tribunal expects. Annual or two-yearly.',
 'Upload your completion certificate.', 30),

('equality_diversity', 'Equality, diversity and inclusion', 'training', '{cross_sector,care,hospitality}', 'person', 'employer_interval', 24, false, false, true, NULL, '{}',
 'Equality Act 2010',
 'Good practice for all staff. Two years by convention.',
 'Upload your completion certificate.', 31),

('data_protection_training', 'Data protection and UK GDPR awareness', 'training', '{cross_sector,care,construction,hospitality,logistics,security}', 'person', 'employer_interval', 12, false, false, true, NULL, '{}',
 'UK GDPR art. 39; ICO Accountability Framework',
 'Anyone who handles personal data. The ICO expects annual refresher training.',
 'Upload your completion certificate.', 32),

('cyber_security_awareness', 'Cyber security awareness', 'training', '{cross_sector,care,construction,hospitality,logistics,security}', 'person', 'employer_interval', 12, false, false, true, NULL, '{}',
 'Cyber Essentials; NCSC guidance',
 'Annual if you hold or want Cyber Essentials; good practice otherwise.',
 'Upload your completion certificate.', 33),

('driving_licence_check', 'Driving licence check', 'check', '{cross_sector,care,construction,hospitality,logistics,security}', 'person', 'status_check', 6, false, true, false, 'DVLA check code', '{}',
 'Road Traffic Act 1988 s.87; HSE INDG382 Driving at work',
 'Anyone who drives on company business, including their own car. Check online via the DVLA service. Every 6 to 12 months; HGV drivers every 3 to 6 months by convention.',
 'Generate a DVLA licence check code at gov.uk/view-driving-licence and share it with your employer.', 34),

('health_surveillance', 'Health surveillance (HAVS, noise, skin, lung)', 'medical', '{cross_sector,construction,logistics,hospitality}', 'person', 'employer_interval', 12, false, false, true, NULL, '{"type": ["havs", "audiometry", "skin", "lung_function", "other"]}',
 'COSHH reg 11; Control of Noise at Work Regulations 2005 reg 9; Control of Vibration at Work Regulations 2005 reg 7',
 'Where the risk assessment requires it. Frequency set by your occupational health provider; annual is typical.',
 'Attend your health surveillance appointment when booked.', 35),

('dbs_check', 'DBS check', 'screening', '{cross_sector,care,hospitality,security}', 'person', 'employer_interval', 36, false, true, true, 'Certificate number', '{"level": ["basic", "standard", "enhanced", "enhanced_barred"]}',
 'Police Act 1997; Safeguarding Vulnerable Groups Act 2006; CQC Regulation 19',
 'DBS certificates have no legal expiry. Set your recheck interval; three years is the most common policy. Use the Update Service item instead if the worker subscribes.',
 'Provide your DBS certificate number and the date on the certificate.', 40),

('dbs_update_service', 'DBS Update Service status check', 'screening', '{cross_sector,care,hospitality,security}', 'person', 'status_check', 12, false, true, false, 'Certificate number', '{}',
 'DBS Update Service; annual subscription held by the worker',
 'The worker holds the subscription; you run a status check online with their consent. Record each check. Annual is the usual policy.',
 'Keep your Update Service subscription active and share your certificate number with your employer.', 41),

('professional_registration', 'Professional registration', 'registration', '{cross_sector,care}', 'person', 'employer_interval', 12, false, true, true, 'Registration or PIN number', '{"body": "text"}',
 'Varies by regulator: HCPC every 2 years; GMC, GPhC and Social Work England annually; FCA certification annual fit-and-proper',
 'Generic registration item. Set the interval to match the regulator. Use the NMC item for nurses.',
 'Upload your registration confirmation or a screenshot of the register entry.', 42),

('safeguarding_adults', 'Safeguarding adults', 'training', '{cross_sector,care,hospitality,security}', 'person', 'employer_interval', 36, false, false, true, NULL, '{"level": ["1", "2", "3"]}',
 'Care Act 2014; CQC Regulation 13; Skills for Care Core and Mandatory Training',
 'Level depends on role. Two to three years by convention.',
 'Upload your safeguarding certificate.', 43),

('safeguarding_children', 'Safeguarding children', 'training', '{cross_sector,care,hospitality}', 'person', 'employer_interval', 36, false, false, true, NULL, '{"level": ["1", "2", "3"]}',
 'Children Act 2004; Working Together to Safeguard Children 2023',
 'Anyone working with or around under-18s. Two to three years by convention.',
 'Upload your safeguarding certificate.', 44),

('sia_licence', 'SIA licence', 'licence', '{security,hospitality}', 'person', 'fixed_interval', 36, true, true, true, 'Licence number', '{"sector": ["door_supervision", "security_guarding", "cctv", "close_protection", "cash_in_transit", "key_holding", "vehicle_immobilisation"]}',
 'Private Security Industry Act 2001',
 'Required for licensable security activity including door supervision. Valid three years. Working without one is a criminal offence for the individual and the employer.',
 'Upload a photo of the front of your SIA licence.', 45),

('bs7858_screening', 'BS 7858 security screening', 'screening', '{security}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'BS 7858:2019',
 'Pre-employment screening covering a five-year history, with periodic rescreening. Set the rescreening interval to match your policy or client contracts.',
 'Provide the documents requested by your screening provider.', 46),

-- ── Care ─────────────────────────────────────────────────────────────────────
('nmc_registration', 'NMC registration and revalidation', 'registration', '{care}', 'person', 'document_date', NULL, true, true, true, 'NMC PIN', '{}',
 'Nursing and Midwifery Order 2001; NMC revalidation every three years, annual fee',
 'Enter the revalidation date shown on NMC Online. A lapsed registration means the nurse cannot practise.',
 'Provide your NMC PIN and a screenshot of your NMC Online record showing the revalidation date.', 50),

('care_certificate', 'Care Certificate', 'training', '{care}', 'person', 'no_expiry', NULL, true, false, true, NULL, '{}',
 'Skills for Care; CQC Regulation 18 (staffing)',
 'Induction standard for new care workers. Does not expire; record the completion date. Aim to complete within 12 weeks of starting.',
 'Upload your Care Certificate.', 51),

('oliver_mcgowan', 'Oliver McGowan mandatory training (learning disability and autism)', 'training', '{care}', 'person', 'employer_interval', 36, false, false, true, NULL, '{"tier": ["1", "2"]}',
 'Health and Care Act 2022 s.181; CQC-registered providers must ensure staff receive it',
 'Tier 1 for general staff, Tier 2 for those providing care. No fixed refresher period yet; three years is a sensible default.',
 'Upload your Oliver McGowan training certificate.', 52),

('moving_handling_care', 'Moving and handling of people', 'training', '{care}', 'person', 'employer_interval', 12, false, false, true, NULL, '{}',
 'Manual Handling Operations Regulations 1992; Skills for Care Core and Mandatory Training',
 'Practical people-handling refresher. Annual is the sector standard.',
 'Upload your moving and handling certificate.', 53),

('medication_competency', 'Medication administration competency', 'training', '{care}', 'person', 'employer_interval', 12, false, true, true, NULL, '{}',
 'CQC Regulation 12; NICE SC1 Managing medicines in care homes',
 'Training plus an observed competency assessment. Annual.',
 'Upload your medication training certificate and competency sign-off.', 54),

('basic_life_support', 'Basic life support', 'training', '{care}', 'person', 'employer_interval', 12, false, false, true, NULL, '{}',
 'Resuscitation Council UK; CQC Regulation 12',
 'Annual practical refresher.',
 'Upload your BLS certificate.', 55),

('infection_prevention_control', 'Infection prevention and control', 'training', '{care,hospitality}', 'person', 'employer_interval', 12, false, false, true, NULL, '{}',
 'Health and Social Care Act 2008 Code of Practice on infection prevention; CQC Regulation 12',
 'Annual refresher.',
 'Upload your IPC certificate.', 56),

('mca_dols', 'Mental Capacity Act and DoLS', 'training', '{care}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'Mental Capacity Act 2005; CQC Regulation 11',
 'All care staff. Three years by convention.',
 'Upload your MCA and DoLS training certificate.', 57),

('prevent', 'PREVENT awareness', 'training', '{care}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'Counter-Terrorism and Security Act 2015 s.26 (Prevent duty)',
 'Three years by convention.',
 'Upload your PREVENT e-learning certificate.', 58),

('dysphagia', 'Dysphagia awareness', 'training', '{care}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'CQC Regulation 14 (nutrition and hydration); IDDSI framework',
 'Where residents have swallowing difficulties. Three years by convention.',
 'Upload your dysphagia training certificate.', 59),

('dsp_toolkit', 'Data Security and Protection Toolkit training', 'training', '{care}', 'person', 'employer_interval', 12, false, false, true, NULL, '{}',
 'NHS Data Security and Protection Toolkit (required for NHS-contracted providers)',
 'Annual data security awareness for NHS-contracted providers.',
 'Upload your DSPT training completion record.', 60),

('supervision', 'Supervision session', 'hr_event', '{care}', 'person', 'employer_interval', 2, false, false, false, NULL, '{}',
 'CQC Regulation 18; Skills for Care recommends around six supervisions a year',
 'Log each supervision. Default interval is every two months, roughly six a year.',
 NULL, 61),

('appraisal', 'Annual appraisal', 'hr_event', '{cross_sector,care}', 'person', 'employer_interval', 12, false, false, false, NULL, '{}',
 'CQC Regulation 18',
 'Log each appraisal. Annual.',
 NULL, 62),

('food_hygiene_l2', 'Food hygiene Level 2', 'training', '{care,hospitality}', 'person', 'employer_interval', 36, false, false, true, 'Certificate number', '{}',
 'Regulation (EC) 852/2004 Annex II Chapter XII; Food Safety and Hygiene (England) Regulations 2013',
 'Legally required to be trained commensurate with the role; three years is EHO convention, not statute.',
 'Upload your Level 2 food hygiene certificate.', 63),

-- ── Construction ─────────────────────────────────────────────────────────────
('cscs_card', 'CSCS card', 'licence', '{construction}', 'person', 'fixed_interval', 60, true, true, true, 'Card number', '{"card_type": "text"}',
 'Build UK and CSCS scheme rules; HS&E test within two years of renewal',
 'Valid five years. Most sites will not admit a worker without a valid card.',
 'Upload a photo of the front of your CSCS card.', 70),

('cpcs_npors', 'CPCS / NPORS plant operator card', 'licence', '{construction}', 'person', 'fixed_interval', 60, true, true, true, 'Card number', '{"categories": "text"}',
 'CPCS and NPORS scheme rules; renewal test required',
 'Valid five years. Record the plant categories held.',
 'Upload a photo of your card showing the categories and expiry.', 71),

('sssts', 'SSSTS (Site Supervisor Safety Training Scheme)', 'training', '{construction}', 'person', 'fixed_interval', 60, true, false, true, 'Certificate number', '{}',
 'CITB Site Safety Plus',
 'Valid five years; one-day refresher before expiry.',
 'Upload your SSSTS certificate.', 72),

('smsts', 'SMSTS (Site Management Safety Training Scheme)', 'training', '{construction}', 'person', 'fixed_interval', 60, true, false, true, 'Certificate number', '{}',
 'CITB Site Safety Plus',
 'Valid five years; two-day refresher before expiry.',
 'Upload your SMSTS certificate.', 73),

('ipaf', 'IPAF (mobile elevating work platforms)', 'licence', '{construction}', 'person', 'fixed_interval', 60, true, true, true, 'PAL card number', '{"categories": "text"}',
 'Work at Height Regulations 2005; IPAF PAL card valid five years',
 'Valid five years. Record the categories, e.g. 3a, 3b.',
 'Upload a photo of your IPAF PAL card.', 74),

('pasma', 'PASMA (mobile access towers)', 'training', '{construction}', 'person', 'fixed_interval', 60, true, false, true, 'Card number', '{}',
 'Work at Height Regulations 2005; PASMA card valid five years',
 'Valid five years.',
 'Upload a photo of your PASMA card.', 75),

('cisrs', 'CISRS scaffolding card', 'licence', '{construction}', 'person', 'fixed_interval', 60, true, true, true, 'Card number', '{"grade": "text"}',
 'CISRS scheme rules; Work at Height Regulations 2005',
 'Valid five years.',
 'Upload a photo of your CISRS card.', 76),

('asbestos_awareness', 'Asbestos awareness', 'training', '{construction}', 'person', 'employer_interval', 12, false, false, true, NULL, '{}',
 'Control of Asbestos Regulations 2012 reg 10; ACOP L143 recommends annual refresher',
 'Anyone who may disturb the fabric of a pre-2000 building. Annual refresher.',
 'Upload your asbestos awareness certificate.', 77),

('abrasive_wheels', 'Abrasive wheels', 'training', '{construction}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'Provision and Use of Work Equipment Regulations 1998 reg 9',
 'Three years by convention.',
 'Upload your abrasive wheels certificate.', 78),

('confined_space', 'Confined space entry', 'training', '{construction,logistics}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'Confined Spaces Regulations 1997',
 'Three years by convention.',
 'Upload your confined space certificate.', 79),

('working_at_height', 'Working at height', 'training', '{construction}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'Work at Height Regulations 2005',
 'Three years by convention.',
 'Upload your working at height certificate.', 80),

('face_fit_testing', 'Face-fit test (tight-fitting RPE)', 'check', '{construction,care}', 'person', 'employer_interval', 12, false, false, true, NULL, '{"mask_model": "text"}',
 'COSHH reg 7; Control of Asbestos Regulations 2012; HSE INDG479',
 'Repeat whenever the mask model or the face changes; annual is common practice. Record the mask model tested.',
 'Upload your face-fit test certificate.', 81),

('site_induction', 'Site-specific induction', 'training', '{construction}', 'person', 'event_based', NULL, true, false, false, NULL, '{"site": "text"}',
 'CDM Regulations 2015 reg 13',
 'One per site. Expires when the project ends. Enter the site name and project end date.',
 NULL, 82),

('gas_safe_acs', 'Gas Safe registration (ACS)', 'registration', '{construction}', 'person', 'fixed_interval', 60, true, true, true, 'Gas Safe ID number', '{"categories": "text"}',
 'Gas Safety (Installation and Use) Regulations 1998; ACS reassessment every five years',
 'Working on gas without registration is a criminal offence.',
 'Upload a photo of your Gas Safe ID card.', 83),

('ecs_card', 'ECS card (electrical) and 18th Edition', 'licence', '{construction}', 'person', 'fixed_interval', 36, true, true, true, 'Card number', '{}',
 'ECS scheme rules; BS 7671:2018 (18th Edition, Amendment 2)',
 'ECS cards are valid three years. The 18th Edition qualification itself does not expire until a new edition is published.',
 'Upload a photo of your ECS card.', 84),

('nrswa', 'NRSWA street works', 'licence', '{construction}', 'person', 'fixed_interval', 60, true, true, true, 'Card number', '{"units": "text"}',
 'New Roads and Street Works Act 1991; reassessment every five years',
 'Valid five years.',
 'Upload a photo of your street works card.', 85),

('ccdo', 'CCDO demolition card', 'licence', '{construction}', 'person', 'fixed_interval', 60, true, true, true, 'Card number', '{}',
 'NDTG CCDO scheme rules',
 'Valid five years.',
 'Upload a photo of your CCDO card.', 86),

('sentinel_pts', 'Network Rail Sentinel / PTS', 'licence', '{construction}', 'person', 'fixed_interval', 24, true, true, true, 'Sentinel number', '{}',
 'Network Rail Sentinel scheme; PTS competence valid two years',
 'Required for work on or near the line.',
 'Upload a photo of your Sentinel card.', 87),

('temporary_works_coordinator', 'Temporary works coordinator / supervisor', 'training', '{construction}', 'person', 'employer_interval', 60, false, false, true, NULL, '{}',
 'BS 5975; CITB TWCTC',
 'Five years by convention.',
 'Upload your TWC or TWS certificate.', 88),

-- ── Hospitality ──────────────────────────────────────────────────────────────
('food_hygiene_l3', 'Food hygiene Level 3 (supervising food safety)', 'training', '{hospitality,care}', 'person', 'employer_interval', 36, false, false, true, 'Certificate number', '{}',
 'Regulation (EC) 852/2004; EHO expectation for supervisors and managers',
 'Supervisors and kitchen managers. Three years by convention.',
 'Upload your Level 3 food safety certificate.', 90),

('allergen_awareness', 'Allergen awareness', 'training', '{hospitality,care}', 'person', 'employer_interval', 12, false, false, true, NULL, '{}',
 'Food Information Regulations 2014; PPDS labelling (Natasha''s Law) from 1 October 2021',
 'All food-handling and front-of-house staff. Annual.',
 'Upload your allergen awareness certificate.', 91),

('haccp', 'HACCP / food safety management', 'training', '{hospitality}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'Regulation (EC) 852/2004 art. 5',
 'Whoever owns the food safety management system. Three years by convention.',
 'Upload your HACCP certificate.', 92),

('personal_licence_ew', 'Personal licence (England and Wales)', 'licence', '{hospitality}', 'person', 'no_expiry', NULL, true, true, true, 'Licence number', '{}',
 'Licensing Act 2003; expiry removed by the Deregulation Act 2015 from 1 April 2015',
 'Personal licences in England and Wales no longer expire. Record it once; update if it is revoked or the holder moves.',
 'Upload a photo of your personal licence.', 93),

('personal_licence_scotland', 'Personal licence (Scotland)', 'licence', '{hospitality}', 'person', 'document_date', NULL, true, true, true, 'Licence number', '{}',
 'Licensing (Scotland) Act 2005; renewal every 10 years',
 'Enter the expiry date on the licence. Refresher training is also required every five years, tracked separately.',
 'Upload a photo of your personal licence showing the expiry date.', 94),

('personal_licence_scotland_refresher', 'Personal licence refresher training (Scotland)', 'training', '{hospitality}', 'person', 'fixed_interval', 60, true, true, true, NULL, '{}',
 'Licensing (Scotland) Act 2005 s.87; refresher within five years of issue and every five years after',
 'Missing the deadline means the licence is revoked.',
 'Upload your refresher training certificate.', 95),

('challenge_25', 'Age verification and licensing (Challenge 25)', 'training', '{hospitality}', 'person', 'employer_interval', 12, false, false, true, NULL, '{}',
 'Licensing Act 2003 mandatory conditions',
 'Anyone selling alcohol. Annual by policy.',
 'Upload your completion record.', 96),

('legionella_awareness', 'Legionella awareness', 'training', '{hospitality,care,construction}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'ACOP L8; HSG274',
 'Responsible persons and maintenance staff. Three years by convention.',
 'Upload your legionella awareness certificate.', 97),

('gambling_staff_training', 'Gambling staff training', 'training', '{hospitality}', 'person', 'employer_interval', 12, false, false, true, NULL, '{}',
 'Gambling Act 2005; LCCP social responsibility code',
 'Where gaming machines are present. Annual.',
 'Upload your completion record.', 98),

-- ── Logistics ────────────────────────────────────────────────────────────────
('driver_cpc', 'Driver CPC (DQC)', 'licence', '{logistics}', 'person', 'fixed_interval', 60, true, true, true, 'DQC number', '{"variant": ["national", "international"], "hours": true}',
 'Vehicle Drivers (Certificates of Professional Competence) Regulations 2007, as amended 3 December 2024',
 '35 hours of periodic training every five years. Since December 2024 there are two variants: National allows 3.5-hour courses and e-learning but is not valid for EU driving; International requires 7-hour courses. Record which one each driver holds and log course hours.',
 'Upload a photo of your DQC card and the certificate for each course you complete.', 100),

('tacho_card', 'Digital tachograph driver card', 'licence', '{logistics}', 'person', 'fixed_interval', 60, true, true, true, 'Card number', '{}',
 'Regulation (EU) 165/2014; DVLA',
 'Valid five years. Driving without a valid card is an offence.',
 'Upload a photo of the front of your tachograph card.', 101),

('driver_medical', 'Vocational licence medical (D4)', 'medical', '{logistics}', 'person', 'age_based', NULL, true, true, true, NULL, '{}',
 'DVLA: medical at 45, then every five years to 65, then annually',
 'Due at 45, every five years until 65, then every year. Needs the driver''s date of birth to calculate.',
 'Upload your D4 medical confirmation or licence renewal.', 102),

('adr', 'ADR dangerous goods', 'licence', '{logistics}', 'person', 'fixed_interval', 60, true, true, true, 'Certificate number', '{"classes": "text"}',
 'Carriage of Dangerous Goods Regulations 2009; ADR 8.2',
 'Valid five years; refresher and exam in the final year.',
 'Upload a photo of your ADR certificate.', 103),

('flt_counterbalance', 'Forklift / counterbalance', 'licence', '{logistics,construction}', 'person', 'employer_interval', 36, false, true, true, 'Certificate number', '{"truck_types": "text"}',
 'PUWER 1998 reg 9; HSE L117; RTITB and AITT three-year convention',
 'No statutory expiry; three-year refresher is the accepted standard.',
 'Upload your forklift certificate.', 104),

('transport_manager_cpc', 'Transport Manager CPC', 'registration', '{logistics}', 'person', 'no_expiry', NULL, true, false, true, 'Certificate number', '{}',
 'Goods Vehicles (Licensing of Operators) Act 1995; Traffic Commissioner expectation of refresher CPD',
 'Does not expire, but Traffic Commissioners expect refresher training. The O-licence continuation is tracked at organisation level.',
 'Upload your Transport Manager CPC certificate.', 105),

('dgsa', 'Dangerous Goods Safety Adviser (DGSA)', 'registration', '{logistics}', 'person', 'fixed_interval', 60, true, false, true, 'Certificate number', '{}',
 'Carriage of Dangerous Goods Regulations 2009; ADR 1.8.3',
 'Valid five years.',
 'Upload your DGSA certificate.', 106),

('driver_eyesight', 'Driver eyesight check', 'medical', '{logistics}', 'person', 'employer_interval', 12, false, false, false, NULL, '{}',
 'Road Traffic Act 1988 s.96; HSE INDG382',
 'Annual number-plate or optician check by policy.',
 'Confirm your eyesight check when asked.', 107),

('tacho_infringement_training', 'Tachograph and drivers'' hours training', 'training', '{logistics}', 'person', 'employer_interval', 12, false, false, true, NULL, '{}',
 'Regulation (EC) 561/2006; Transport Act 1968',
 'Annual refresher by policy; also useful evidence for DVSA earned recognition.',
 'Upload your completion record.', 108),

('lorry_loader', 'Lorry loader (HIAB) / ALLMI', 'licence', '{logistics}', 'person', 'employer_interval', 60, false, true, true, 'Card number', '{}',
 'LOLER 1998; ALLMI five-year convention',
 'Five years by convention.',
 'Upload a photo of your lorry loader card.', 109),

('tail_lift', 'Tail-lift operation', 'training', '{logistics}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'PUWER 1998; LOLER 1998',
 'Three years by convention.',
 'Upload your completion record.', 110),

('banksman', 'Banksman / vehicle marshal', 'training', '{logistics,construction}', 'person', 'employer_interval', 36, false, false, true, NULL, '{}',
 'Workplace (Health, Safety and Welfare) Regulations 1992 reg 17',
 'Three years by convention.',
 'Upload your completion record.', 111),

-- ── Organisation-level ───────────────────────────────────────────────────────
('org_employers_liability', 'Employer''s liability insurance certificate', 'check', '{cross_sector,care,construction,hospitality,logistics,security}', 'organisation', 'document_date', NULL, true, true, true, 'Policy number', '{}',
 'Employers'' Liability (Compulsory Insurance) Act 1969',
 'Minimum 5 million pounds cover. Enter the policy expiry date and upload the certificate.',
 NULL, 200),

('org_fire_risk_assessment', 'Fire risk assessment review', 'check', '{cross_sector,care,construction,hospitality,logistics,security}', 'organisation', 'employer_interval', 12, false, false, true, NULL, '{}',
 'Regulatory Reform (Fire Safety) Order 2005 art. 9',
 'Review annually and after any significant change.',
 NULL, 201),

('org_hs_policy_review', 'Health and safety policy review', 'check', '{cross_sector,care,construction,hospitality,logistics,security}', 'organisation', 'employer_interval', 12, false, false, true, NULL, '{}',
 'Health and Safety at Work etc. Act 1974 s.2(3)',
 'Written policy required with five or more employees. Annual review.',
 NULL, 202),

('org_legionella_risk_assessment', 'Legionella risk assessment', 'check', '{cross_sector,care,hospitality,construction}', 'organisation', 'employer_interval', 24, false, false, true, NULL, '{}',
 'COSHH; ACOP L8',
 'Review regularly and when the system changes; two years by convention.',
 NULL, 203),

('org_pat_testing', 'Portable appliance testing', 'check', '{cross_sector,care,hospitality,logistics,security}', 'organisation', 'employer_interval', 12, false, false, true, NULL, '{}',
 'Electricity at Work Regulations 1989',
 'Frequency depends on equipment and use; annual is the common policy.',
 NULL, 204),

('org_gas_safety_cert', 'Gas safety certificate (commercial)', 'check', '{hospitality,care}', 'organisation', 'employer_interval', 12, false, true, true, NULL, '{}',
 'Gas Safety (Installation and Use) Regulations 1998',
 'Annual inspection of commercial catering and heating appliances by a Gas Safe engineer.',
 NULL, 205),

('org_ico_fee', 'ICO data protection fee', 'registration', '{cross_sector,care,construction,hospitality,logistics,security}', 'organisation', 'fixed_interval', 12, true, false, true, 'ICO registration number', '{}',
 'Data Protection (Charges and Information) Regulations 2018',
 'Annual fee. Not paying is a fixed penalty.',
 NULL, 206),

('org_cyber_essentials', 'Cyber Essentials certification', 'registration', '{cross_sector,care,construction,hospitality,logistics,security}', 'organisation', 'fixed_interval', 12, true, false, true, 'Certificate number', '{}',
 'NCSC Cyber Essentials scheme',
 'Valid 12 months.',
 NULL, 207),

('org_o_licence', 'Operator''s licence continuation', 'registration', '{logistics}', 'organisation', 'fixed_interval', 60, true, true, true, 'Licence number', '{}',
 'Goods Vehicles (Licensing of Operators) Act 1995; continuation every five years',
 'Continuation fee and declaration every five years. Missing it means the licence terminates.',
 NULL, 208),

('org_cqc_registration', 'CQC registration and Provider Information Return', 'registration', '{care}', 'organisation', 'employer_interval', 12, false, true, true, 'CQC provider ID', '{}',
 'Health and Social Care Act 2008 (Regulated Activities) Regulations 2014',
 'Annual fee and PIR when requested. Track the anniversary.',
 NULL, 209),

('org_food_premises_registration', 'Food business registration', 'registration', '{hospitality,care}', 'organisation', 'no_expiry', NULL, true, true, false, NULL, '{}',
 'Regulation (EC) 852/2004 art. 6; register 28 days before trading',
 'Register once with the local authority; notify changes. No expiry.',
 NULL, 210),

('org_premises_licence', 'Premises licence annual fee', 'registration', '{hospitality}', 'organisation', 'fixed_interval', 12, true, true, true, 'Licence number', '{}',
 'Licensing Act 2003 s.55A; licence suspended if the annual fee is unpaid',
 'Annual fee on the anniversary of the grant.',
 NULL, 211),

('org_sponsor_licence', 'Sponsor licence', 'registration', '{cross_sector,care,construction,hospitality,logistics}', 'organisation', 'no_expiry', NULL, true, true, true, 'Licence number', '{}',
 'Workers and Temporary Workers sponsor guidance; renewal requirement removed from 6 April 2024',
 'Sponsor licences no longer need renewing, but key personnel, reporting and record-keeping duties continue. Record the licence and its key contacts.',
 NULL, 212)

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
  reference_label = EXCLUDED.reference_label,
  captures = EXCLUDED.captures,
  statutory_basis = EXCLUDED.statutory_basis,
  description = EXCLUDED.description,
  guidance = EXCLUDED.guidance,
  sort_order = EXCLUDED.sort_order;
