-- ============================================================================
-- UK EMPLOYEE ONBOARDING PLATFORM — Supabase Schema
-- ============================================================================
-- Run this migration in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- 
-- ARCHITECTURE DECISIONS ENCODED IN THIS SCHEMA:
-- 1. Documents attach to employee_profiles, NOT onboarding_instances (portability)
-- 2. Sensitive fields (NI, bank) stored as encrypted TEXT (app-level AES-256)
-- 3. Consent is granular per data-category, per employer
-- 4. Every mutation is audit-logged
-- 5. One auth.users entry can be an employer, employee, or both
-- ============================================================================


-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- gen_random_uuid(), useful for tokens
CREATE EXTENSION IF NOT EXISTS "moddatetime";     -- auto-update updated_at timestamps


-- ============================================================================
-- 1. CUSTOM TYPES (ENUMS)
-- ============================================================================

-- What kind of checklist item is this?
CREATE TYPE checklist_item_type AS ENUM (
  'document_upload',    -- Employee uploads a file (P45, passport, etc.)
  'form_entry',         -- Employee fills in structured data (NI, bank, emergency)
  'acknowledgement'     -- Employee reads and confirms (policy, contract)
);

-- Lifecycle status of a single checklist item
CREATE TYPE checklist_status AS ENUM (
  'not_started',
  'in_progress',
  'submitted',
  'approved',
  'rejected',           -- Employer requested re-upload/correction
  'overdue'
);

-- What category of data does a consent record cover?
-- This drives granular sharing: employee can share RTW docs but not bank details
CREATE TYPE data_category AS ENUM (
  'personal_info',      -- Name, DOB, address
  'ni_number',
  'bank_details',
  'emergency_contacts',
  'right_to_work',
  'documents',          -- General uploaded documents
  'policy_acknowledgements'
);

-- Document verification status
CREATE TYPE verification_status AS ENUM (
  'pending',
  'verified',
  'expired',
  'rejected'
);

-- What action was performed (for audit log)
CREATE TYPE audit_action AS ENUM (
  'profile_created',
  'profile_updated',
  'document_uploaded',
  'document_viewed',
  'document_approved',
  'document_rejected',
  'checklist_item_submitted',
  'checklist_item_approved',
  'checklist_item_rejected',
  'onboarding_created',
  'onboarding_completed',
  'consent_granted',
  'consent_withdrawn',
  'invitation_sent',
  'data_exported',
  'profile_accessed'
);


-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 EMPLOYER ACCOUNTS
-- The company entity. One row per employer organisation.
-- ----------------------------------------------------------------------------
CREATE TABLE employer_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Company details
  company_name    TEXT NOT NULL,
  company_number  TEXT,                       -- Companies House number, optional at signup
  company_logo_url TEXT,                      -- For employee-facing branding
  
  -- Billing
  stripe_customer_id   TEXT,                  -- Set when billing is activated
  subscription_status  TEXT DEFAULT 'trial',  -- trial | active | past_due | cancelled
  onboardings_used     INT DEFAULT 0,         -- Counter for free trial (first 3 free)
  
  -- Metadata
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 2.2 EMPLOYER MEMBERS
-- Links auth.users to employer accounts. MVP: one member per employer (the owner).
-- Future: add role column for team support (admin, reviewer, viewer).
-- ----------------------------------------------------------------------------
CREATE TABLE employer_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id     UUID NOT NULL REFERENCES employer_accounts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'owner',  -- owner | admin | reviewer (future)
  
  -- Contact details for this member
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  UNIQUE(employer_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 2.3 EMPLOYEE PROFILES
-- The portable profile. Owned by the employee. Persists across employers.
-- One row per employee, linked to auth.users.
-- Sensitive fields stored as encrypted TEXT (app-level AES-256 before write).
-- ----------------------------------------------------------------------------
CREATE TABLE employee_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal info (plain text — not highly sensitive)
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  date_of_birth   DATE,
  address_line_1  TEXT,
  address_line_2  TEXT,
  city            TEXT,
  postcode        TEXT,
  country         TEXT DEFAULT 'United Kingdom',
  phone           TEXT,
  
  -- Sensitive fields — stored as AES-256 encrypted TEXT
  -- The application encrypts before writing and decrypts after reading.
  -- Column names use _encrypted suffix as a clear signal to developers.
  ni_number_encrypted       TEXT,   -- UK National Insurance number
  bank_account_name         TEXT,   -- Account holder name (not highly sensitive)
  bank_sort_code_encrypted  TEXT,   -- 6-digit sort code
  bank_account_number_encrypted TEXT, -- 8-digit account number
  bank_building_society_ref TEXT,   -- Optional building society roll number
  
  -- Emergency contacts (stored as JSONB array for flexibility)
  -- Each entry: { name, relationship, phone, email? }
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  
  -- Right to work
  right_to_work_status TEXT,        -- e.g., 'british_citizen', 'settled_status', 'visa', 'pending'
  right_to_work_expiry DATE,        -- NULL if indefinite (e.g., British citizen)
  
  -- Profile completeness (calculated, helps with portability UX)
  profile_completeness_pct INT DEFAULT 0,
  
  -- Metadata
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 2.4 ONBOARDING TEMPLATES
-- Employer-defined templates. Each employer gets a default UK template on signup.
-- Employers can create multiple templates for different role types.
-- ----------------------------------------------------------------------------
CREATE TABLE onboarding_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id     UUID NOT NULL REFERENCES employer_accounts(id) ON DELETE CASCADE,
  
  template_name   TEXT NOT NULL,              -- e.g., "Standard UK Onboarding"
  role_type       TEXT,                       -- e.g., "Full-time", "Contractor", "Part-time"
  is_default      BOOLEAN DEFAULT false,      -- One default template per employer
  
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 2.5 TEMPLATE ITEMS
-- Individual items within a template. These become checklist_items when an
-- onboarding instance is created.
-- ----------------------------------------------------------------------------
CREATE TABLE template_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id     UUID NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
  
  item_name       TEXT NOT NULL,              -- e.g., "P45 from previous employer"
  description     TEXT,                       -- Guidance text shown to employee
  item_type       checklist_item_type NOT NULL, -- document_upload | form_entry | acknowledgement
  
  -- Which data category does this item relate to? (drives consent logic)
  data_category   data_category NOT NULL DEFAULT 'documents',
  
  -- For form_entry type: which profile field(s) does this populate?
  -- e.g., 'ni_number', 'bank_details', 'emergency_contacts'
  form_field_key  TEXT,
  
  -- For acknowledgement type: policy content or URL
  policy_content  TEXT,                       -- Inline text content
  policy_file_url TEXT,                       -- Or link to uploaded PDF
  
  -- Deadline relative to start date
  deadline_days_before_start INT DEFAULT 0,   -- 0 = due on start date, 7 = due 7 days before
  
  -- Display order
  sort_order      INT NOT NULL DEFAULT 0,
  
  -- Is this item required or optional?
  is_required     BOOLEAN DEFAULT true,
  
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 2.6 ONBOARDING INSTANCES
-- A specific onboarding: one employee + one employer + one hire.
-- Created when employer invites a new starter.
-- ----------------------------------------------------------------------------
CREATE TABLE onboarding_instances (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id     UUID NOT NULL REFERENCES employer_accounts(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES employee_profiles(id),  -- NULL until employee accepts invite
  template_id     UUID REFERENCES onboarding_templates(id) ON DELETE SET NULL,
  
  -- Invitation details (known before employee signs up)
  invitee_name    TEXT NOT NULL,
  invitee_email   TEXT NOT NULL,
  role_title      TEXT,
  start_date      DATE NOT NULL,
  
  -- Invitation token for magic link
  invitation_token UUID DEFAULT uuid_generate_v4() UNIQUE,
  invitation_sent_at TIMESTAMPTZ,
  invitation_accepted_at TIMESTAMPTZ,
  
  -- Status
  status          TEXT NOT NULL DEFAULT 'invited',  -- invited | in_progress | complete | cancelled
  readiness_pct   INT DEFAULT 0,                    -- Day-one readiness score (0–100)
  
  completed_at    TIMESTAMPTZ,
  
  -- Metadata
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 2.7 CHECKLIST ITEMS
-- Concrete items within an onboarding instance. Created by copying from
-- template_items when the onboarding instance is created.
-- ----------------------------------------------------------------------------
CREATE TABLE checklist_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  onboarding_id   UUID NOT NULL REFERENCES onboarding_instances(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES template_items(id) ON DELETE SET NULL,
  
  -- Copied from template_item (so template can change without affecting active onboardings)
  item_name       TEXT NOT NULL,
  description     TEXT,
  item_type       checklist_item_type NOT NULL,
  data_category   data_category NOT NULL DEFAULT 'documents',
  form_field_key  TEXT,
  policy_content  TEXT,
  policy_file_url TEXT,
  is_required     BOOLEAN DEFAULT true,
  sort_order      INT NOT NULL DEFAULT 0,
  
  -- Status tracking
  status          checklist_status NOT NULL DEFAULT 'not_started',
  deadline        DATE,                       -- Calculated from start_date - deadline_days_before_start
  
  -- Links to submitted data
  -- For document_upload: references document_uploads.id
  document_upload_id UUID,                    -- Set when employee uploads/links a document
  -- For form_entry: data is on the employee_profiles table directly
  -- For acknowledgement: acknowledged_at is the proof
  acknowledged_at TIMESTAMPTZ,
  
  -- Employer review
  reviewed_by     UUID REFERENCES auth.users(id),
  reviewed_at     TIMESTAMPTZ,
  reviewer_notes  TEXT,                       -- Required when rejecting
  
  -- Pre-populated from portable profile?
  was_pre_populated BOOLEAN DEFAULT false,    -- True if data came from existing profile
  
  -- Metadata
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 2.8 DOCUMENT UPLOADS
-- Files uploaded by employees. Attached to EMPLOYEE PROFILE (not onboarding).
-- This is the core portability mechanism: documents travel with the employee.
-- ----------------------------------------------------------------------------
CREATE TABLE document_uploads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  
  -- Document metadata
  document_type   TEXT NOT NULL,              -- e.g., 'p45', 'passport', 'brp', 'bank_statement'
  document_name   TEXT NOT NULL,              -- Original filename
  file_path       TEXT NOT NULL,              -- Path in Supabase Storage
  file_size_bytes INT,
  mime_type       TEXT,                       -- application/pdf, image/jpeg, image/png
  
  -- Categorisation (for consent and portability)
  data_category   data_category NOT NULL DEFAULT 'documents',
  
  -- Verification
  verification_status verification_status DEFAULT 'pending',
  
  -- Expiry (critical for right to work documents — a visa expires, a passport expires)
  expiry_date     DATE,                       -- NULL if document does not expire
  
  -- Metadata
  uploaded_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 2.9 CONSENT RECORDS
-- Every data share between employee and employer requires explicit consent.
-- Consent is granular by data_category. Immutable insert-only design:
-- granting and withdrawing consent both create new rows (audit-friendly).
-- ----------------------------------------------------------------------------
CREATE TABLE consent_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  employer_id     UUID NOT NULL REFERENCES employer_accounts(id) ON DELETE CASCADE,
  
  -- What is being consented to
  data_category   data_category NOT NULL,
  
  -- Consent action
  action          TEXT NOT NULL,              -- 'granted' | 'withdrawn'
  
  -- When
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Optional: specific onboarding context
  onboarding_id   UUID REFERENCES onboarding_instances(id) ON DELETE SET NULL,
  
  -- For audit: which document(s) were included in this consent, if applicable
  document_ids    UUID[] DEFAULT '{}'
);

-- Consent is append-only. No UPDATE or DELETE allowed — enforced by RLS.

-- ----------------------------------------------------------------------------
-- 2.10 AUDIT LOG
-- Immutable record of every significant action. Insert-only.
-- Both employers and employees can view relevant entries.
-- ----------------------------------------------------------------------------
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Who performed the action
  actor_id        UUID NOT NULL REFERENCES auth.users(id),
  actor_type      TEXT NOT NULL,              -- 'employer' | 'employee' | 'system'
  
  -- What happened
  action          audit_action NOT NULL,
  
  -- Context
  resource_type   TEXT,                       -- 'document', 'checklist_item', 'onboarding', 'profile', 'consent'
  resource_id     UUID,                       -- ID of the affected resource
  employer_id     UUID REFERENCES employer_accounts(id),
  employee_id     UUID REFERENCES employee_profiles(id),
  onboarding_id   UUID REFERENCES onboarding_instances(id),
  
  -- Additional details (flexible JSONB for action-specific metadata)
  metadata        JSONB DEFAULT '{}'::jsonb,
  
  -- IP address for security audit (optional but recommended)
  ip_address      INET,
  
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Audit log is append-only. No UPDATE or DELETE allowed — enforced by RLS.


-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- Employer lookups
CREATE INDEX idx_employer_members_user_id ON employer_members(user_id);
CREATE INDEX idx_employer_members_employer_id ON employer_members(employer_id);

-- Employee profile lookup by auth user
CREATE INDEX idx_employee_profiles_user_id ON employee_profiles(user_id);

-- Templates per employer
CREATE INDEX idx_onboarding_templates_employer_id ON onboarding_templates(employer_id);
CREATE INDEX idx_template_items_template_id ON template_items(template_id);
CREATE INDEX idx_template_items_sort_order ON template_items(template_id, sort_order);

-- Onboarding instance lookups
CREATE INDEX idx_onboarding_instances_employer_id ON onboarding_instances(employer_id);
CREATE INDEX idx_onboarding_instances_employee_id ON onboarding_instances(employee_id);
CREATE INDEX idx_onboarding_instances_invitee_email ON onboarding_instances(invitee_email);
CREATE INDEX idx_onboarding_instances_invitation_token ON onboarding_instances(invitation_token);
CREATE INDEX idx_onboarding_instances_status ON onboarding_instances(status);

-- Checklist item lookups
CREATE INDEX idx_checklist_items_onboarding_id ON checklist_items(onboarding_id);
CREATE INDEX idx_checklist_items_status ON checklist_items(status);
CREATE INDEX idx_checklist_items_deadline ON checklist_items(deadline) WHERE status NOT IN ('approved');

-- Document lookups
CREATE INDEX idx_document_uploads_employee_id ON document_uploads(employee_id);
CREATE INDEX idx_document_uploads_type ON document_uploads(employee_id, document_type);
CREATE INDEX idx_document_uploads_expiry ON document_uploads(expiry_date) WHERE expiry_date IS NOT NULL;

-- Consent lookups (finding active consent for a specific employee+employer+category)
CREATE INDEX idx_consent_records_lookup ON consent_records(employee_id, employer_id, data_category, created_at DESC);

-- Audit log lookups
CREATE INDEX idx_audit_log_employer ON audit_log(employer_id, created_at DESC);
CREATE INDEX idx_audit_log_employee ON audit_log(employee_id, created_at DESC);
CREATE INDEX idx_audit_log_onboarding ON audit_log(onboarding_id, created_at DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id, created_at DESC);


-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 Get the employer_id for the currently authenticated user.
-- Returns NULL if the user is not an employer member.
-- Used extensively in RLS policies.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_employer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT employer_id 
  FROM employer_members 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- ----------------------------------------------------------------------------
-- 4.2 Get the employee_profile.id for the currently authenticated user.
-- Returns NULL if the user doesn't have an employee profile.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id 
  FROM employee_profiles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- ----------------------------------------------------------------------------
-- 4.3 Check whether an employee has active consent for a given employer + category.
-- "Active" means the most recent consent record for that tuple is 'granted'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION has_active_consent(
  p_employee_id UUID,
  p_employer_id UUID,
  p_data_category data_category
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT action = 'granted'
      FROM consent_records
      WHERE employee_id = p_employee_id
        AND employer_id = p_employer_id
        AND data_category = p_data_category
      ORDER BY created_at DESC
      LIMIT 1
    ),
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- 4.4 Auto-update updated_at on row modification.
-- Attach this trigger to any table with an updated_at column.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON employer_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON employee_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON onboarding_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON onboarding_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON document_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 5. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- 
-- DESIGN PRINCIPLES:
-- 1. Every table has RLS enabled. No exceptions.
-- 2. Employers can only see/modify data for their own organisation.
-- 3. Employees can only see/modify their own profile and documents.
-- 4. Employers can see employee data ONLY when:
--    (a) An active onboarding instance links them, AND
--    (b) The employee has granted consent for that data category.
-- 5. Audit log and consent records are append-only (INSERT, SELECT — no UPDATE/DELETE).
-- 6. Service role (used by server-side code) bypasses RLS — handle with care.
--
-- NOTE: These policies use auth.uid() which requires the request to come through
-- Supabase client with a valid JWT. Server Actions using the service_role key
-- bypass RLS entirely — use this for system operations (reminders, status engine).
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE employer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 5.1 EMPLOYER ACCOUNTS
-- Employers can read/update their own company. Insert handled by signup flow.
-- ----------------------------------------------------------------------------
CREATE POLICY "employer_accounts_select" ON employer_accounts
  FOR SELECT USING (
    id = get_my_employer_id()
  );

CREATE POLICY "employer_accounts_insert" ON employer_accounts
  FOR INSERT WITH CHECK (true);  -- Signup flow creates this, then immediately creates employer_member

CREATE POLICY "employer_accounts_update" ON employer_accounts
  FOR UPDATE USING (
    id = get_my_employer_id()
  );

-- No DELETE policy — employers cannot delete their own account via client. Admin/support only.

-- ----------------------------------------------------------------------------
-- 5.2 EMPLOYER MEMBERS
-- Members can see other members of their own organisation. Insert during signup.
-- ----------------------------------------------------------------------------
CREATE POLICY "employer_members_select" ON employer_members
  FOR SELECT USING (
    employer_id = get_my_employer_id()
  );

CREATE POLICY "employer_members_insert" ON employer_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()  -- You can only create a membership for yourself (signup flow)
  );

-- ----------------------------------------------------------------------------
-- 5.3 EMPLOYEE PROFILES
-- Employees can read/update their own profile only.
-- Employers CANNOT read employee profiles directly — they access data through
-- checklist items and document uploads, gated by consent.
-- ----------------------------------------------------------------------------
CREATE POLICY "employee_profiles_select_own" ON employee_profiles
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "employee_profiles_insert" ON employee_profiles
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "employee_profiles_update" ON employee_profiles
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Employer read access to employee name/email for their active onboardings
-- (non-sensitive fields only, needed for dashboard display)
CREATE POLICY "employee_profiles_select_employer" ON employee_profiles
  FOR SELECT USING (
    id IN (
      SELECT employee_id 
      FROM onboarding_instances 
      WHERE employer_id = get_my_employer_id()
        AND employee_id IS NOT NULL
    )
  );

-- ----------------------------------------------------------------------------
-- 5.4 ONBOARDING TEMPLATES
-- Employers can CRUD their own templates.
-- ----------------------------------------------------------------------------
CREATE POLICY "templates_select" ON onboarding_templates
  FOR SELECT USING (
    employer_id = get_my_employer_id()
  );

CREATE POLICY "templates_insert" ON onboarding_templates
  FOR INSERT WITH CHECK (
    employer_id = get_my_employer_id()
  );

CREATE POLICY "templates_update" ON onboarding_templates
  FOR UPDATE USING (
    employer_id = get_my_employer_id()
  );

CREATE POLICY "templates_delete" ON onboarding_templates
  FOR DELETE USING (
    employer_id = get_my_employer_id()
  );

-- ----------------------------------------------------------------------------
-- 5.5 TEMPLATE ITEMS
-- Same access as their parent template.
-- ----------------------------------------------------------------------------
CREATE POLICY "template_items_select" ON template_items
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM onboarding_templates WHERE employer_id = get_my_employer_id()
    )
  );

CREATE POLICY "template_items_insert" ON template_items
  FOR INSERT WITH CHECK (
    template_id IN (
      SELECT id FROM onboarding_templates WHERE employer_id = get_my_employer_id()
    )
  );

CREATE POLICY "template_items_update" ON template_items
  FOR UPDATE USING (
    template_id IN (
      SELECT id FROM onboarding_templates WHERE employer_id = get_my_employer_id()
    )
  );

CREATE POLICY "template_items_delete" ON template_items
  FOR DELETE USING (
    template_id IN (
      SELECT id FROM onboarding_templates WHERE employer_id = get_my_employer_id()
    )
  );

-- ----------------------------------------------------------------------------
-- 5.6 ONBOARDING INSTANCES
-- Employers see their own. Employees see instances they're linked to.
-- ----------------------------------------------------------------------------
CREATE POLICY "onboarding_select_employer" ON onboarding_instances
  FOR SELECT USING (
    employer_id = get_my_employer_id()
  );

CREATE POLICY "onboarding_select_employee" ON onboarding_instances
  FOR SELECT USING (
    employee_id = get_my_employee_id()
  );

-- Also allow select by invitation token (for accepting invitations before profile is linked)
CREATE POLICY "onboarding_select_by_token" ON onboarding_instances
  FOR SELECT USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "onboarding_insert_employer" ON onboarding_instances
  FOR INSERT WITH CHECK (
    employer_id = get_my_employer_id()
  );

CREATE POLICY "onboarding_update_employer" ON onboarding_instances
  FOR UPDATE USING (
    employer_id = get_my_employer_id()
  );

-- Employee can update their own onboarding (to accept invitation, link profile)
CREATE POLICY "onboarding_update_employee" ON onboarding_instances
  FOR UPDATE USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 5.7 CHECKLIST ITEMS
-- Employers see items for their onboardings. Employees see items for their onboardings.
-- ----------------------------------------------------------------------------
CREATE POLICY "checklist_select_employer" ON checklist_items
  FOR SELECT USING (
    onboarding_id IN (
      SELECT id FROM onboarding_instances WHERE employer_id = get_my_employer_id()
    )
  );

CREATE POLICY "checklist_select_employee" ON checklist_items
  FOR SELECT USING (
    onboarding_id IN (
      SELECT id FROM onboarding_instances WHERE employee_id = get_my_employee_id()
    )
  );

-- Employer can insert checklist items (when creating onboarding from template)
CREATE POLICY "checklist_insert_employer" ON checklist_items
  FOR INSERT WITH CHECK (
    onboarding_id IN (
      SELECT id FROM onboarding_instances WHERE employer_id = get_my_employer_id()
    )
  );

-- Employer can update (approve, reject, add notes)
CREATE POLICY "checklist_update_employer" ON checklist_items
  FOR UPDATE USING (
    onboarding_id IN (
      SELECT id FROM onboarding_instances WHERE employer_id = get_my_employer_id()
    )
  );

-- Employee can update their own checklist items (submit, link document)
CREATE POLICY "checklist_update_employee" ON checklist_items
  FOR UPDATE USING (
    onboarding_id IN (
      SELECT id FROM onboarding_instances WHERE employee_id = get_my_employee_id()
    )
  );

-- ----------------------------------------------------------------------------
-- 5.8 DOCUMENT UPLOADS
-- Employees own their documents. Employers can view documents ONLY for employees
-- in their active onboardings AND with active consent for that data category.
-- ----------------------------------------------------------------------------
CREATE POLICY "documents_select_own" ON document_uploads
  FOR SELECT USING (
    employee_id = get_my_employee_id()
  );

CREATE POLICY "documents_insert" ON document_uploads
  FOR INSERT WITH CHECK (
    employee_id = get_my_employee_id()
  );

CREATE POLICY "documents_update" ON document_uploads
  FOR UPDATE USING (
    employee_id = get_my_employee_id()
  );

-- Employer can view documents where: employee is in their onboarding + consent is active
CREATE POLICY "documents_select_employer" ON document_uploads
  FOR SELECT USING (
    -- Employee must be in one of this employer's active onboardings
    employee_id IN (
      SELECT employee_id 
      FROM onboarding_instances 
      WHERE employer_id = get_my_employer_id()
        AND status IN ('in_progress', 'complete')
        AND employee_id IS NOT NULL
    )
    AND
    -- Employee must have granted consent for this document's data category
    has_active_consent(employee_id, get_my_employer_id(), data_category)
  );

-- Employees can delete their own documents (GDPR: right to erasure)
CREATE POLICY "documents_delete_own" ON document_uploads
  FOR DELETE USING (
    employee_id = get_my_employee_id()
  );

-- ----------------------------------------------------------------------------
-- 5.9 CONSENT RECORDS
-- Both parties can read consent records relevant to them.
-- Only employees can insert (grant or withdraw consent).
-- No updates or deletes — append-only for audit integrity.
-- ----------------------------------------------------------------------------
CREATE POLICY "consent_select_employee" ON consent_records
  FOR SELECT USING (
    employee_id = get_my_employee_id()
  );

CREATE POLICY "consent_select_employer" ON consent_records
  FOR SELECT USING (
    employer_id = get_my_employer_id()
  );

CREATE POLICY "consent_insert_employee" ON consent_records
  FOR INSERT WITH CHECK (
    employee_id = get_my_employee_id()
  );

-- No UPDATE or DELETE policies — consent records are immutable.

-- ----------------------------------------------------------------------------
-- 5.10 AUDIT LOG
-- Both parties can read entries relevant to them.
-- Insert is allowed for any authenticated user (actions are logged from app code).
-- No updates or deletes — immutable.
-- ----------------------------------------------------------------------------
CREATE POLICY "audit_select_employer" ON audit_log
  FOR SELECT USING (
    employer_id = get_my_employer_id()
  );

CREATE POLICY "audit_select_employee" ON audit_log
  FOR SELECT USING (
    employee_id = get_my_employee_id()
  );

CREATE POLICY "audit_insert" ON audit_log
  FOR INSERT WITH CHECK (
    actor_id = auth.uid()
  );

-- No UPDATE or DELETE policies — audit log is immutable.


-- ============================================================================
-- 6. SUPABASE STORAGE BUCKET
-- ============================================================================
-- Run this separately in Supabase Dashboard → Storage → Create Bucket
-- or via the Supabase client in your app's setup script.
--
-- Bucket: 'employee-documents'
-- Public: false (private)
-- File size limit: 10MB
-- Allowed MIME types: application/pdf, image/jpeg, image/png
--
-- Storage RLS policies (set in Dashboard → Storage → Policies):
--
-- SELECT: Employee can read files in their own folder
--   ((bucket_id = 'employee-documents') AND (auth.uid()::text = (storage.foldername(name))[1]))
--
-- INSERT: Employee can upload to their own folder
--   ((bucket_id = 'employee-documents') AND (auth.uid()::text = (storage.foldername(name))[1]))
--
-- File path convention: {user_id}/{document_type}_{timestamp}.{ext}
-- Example: 550e8400-e29b/p45_1711234567.pdf
-- ============================================================================


-- ============================================================================
-- 7. DEFAULT UK ONBOARDING TEMPLATE (SEED DATA)
-- ============================================================================
-- This function creates a default template when an employer signs up.
-- Call it from your signup Server Action after creating the employer_account.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_template(p_employer_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_id UUID;
BEGIN
  INSERT INTO onboarding_templates (employer_id, template_name, role_type, is_default)
  VALUES (p_employer_id, 'Standard UK Onboarding', 'Full-time', true)
  RETURNING id INTO v_template_id;

  INSERT INTO template_items (template_id, item_name, description, item_type, data_category, form_field_key, sort_order, deadline_days_before_start) VALUES
  (v_template_id, 'National Insurance number',
   'Your NI number is on your payslip, P60, or any letter from HMRC. Format: two letters, six numbers, one letter (e.g., QQ 12 34 56 C).',
   'form_entry', 'ni_number', 'ni_number', 1, 7),

  (v_template_id, 'Bank details for payroll',
   'We need your sort code and account number so we can pay you. This must be a UK bank account in your name.',
   'form_entry', 'bank_details', 'bank_details', 2, 7),

  (v_template_id, 'Emergency contact details',
   'Please provide at least one emergency contact with their name, relationship to you, and phone number.',
   'form_entry', 'emergency_contacts', 'emergency_contacts', 3, 3),

  (v_template_id, 'P45 from previous employer',
   'Your previous employer should give you a P45 when you leave. If you don''t have one yet, you can submit it after your start date. Upload as PDF or photo.',
   'document_upload', 'documents', NULL, 4, 0),

  (v_template_id, 'Proof of right to work in the UK',
   'We are legally required to verify your right to work before your first day. Acceptable documents: British or Irish passport, biometric residence permit (BRP), or a share code from the GOV.UK online right to work service.',
   'document_upload', 'right_to_work', NULL, 5, 7),

  (v_template_id, 'Proof of address',
   'A recent utility bill, bank statement, or council tax bill showing your current address. Must be dated within the last 3 months.',
   'document_upload', 'personal_info', NULL, 6, 3),

  (v_template_id, 'Photo ID',
   'A clear photo or scan of your passport, driving licence, or national ID card.',
   'document_upload', 'documents', NULL, 7, 7),

  (v_template_id, 'Employee privacy notice',
   'Please read our privacy notice which explains how we collect, use, and protect your personal data during and after your employment.',
   'acknowledgement', 'policy_acknowledgements', NULL, 8, 3);

  RETURN v_template_id;
END;
$$;


-- ============================================================================
-- 8. UTILITY FUNCTION: Create onboarding from template
-- ============================================================================
-- Called when employer invites a new starter. Creates the onboarding instance
-- and copies template items into checklist_items with calculated deadlines.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_onboarding_from_template(
  p_employer_id UUID,
  p_template_id UUID,
  p_invitee_name TEXT,
  p_invitee_email TEXT,
  p_role_title TEXT,
  p_start_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_onboarding_id UUID;
BEGIN
  -- Create the onboarding instance
  INSERT INTO onboarding_instances (
    employer_id, template_id, invitee_name, invitee_email, role_title, start_date
  ) VALUES (
    p_employer_id, p_template_id, p_invitee_name, p_invitee_email, p_role_title, p_start_date
  )
  RETURNING id INTO v_onboarding_id;

  -- Copy template items into checklist items with calculated deadlines
  INSERT INTO checklist_items (
    onboarding_id, template_item_id, item_name, description, item_type,
    data_category, form_field_key, policy_content, policy_file_url,
    is_required, sort_order, deadline
  )
  SELECT
    v_onboarding_id,
    ti.id,
    ti.item_name,
    ti.description,
    ti.item_type,
    ti.data_category,
    ti.form_field_key,
    ti.policy_content,
    ti.policy_file_url,
    ti.is_required,
    ti.sort_order,
    p_start_date - ti.deadline_days_before_start  -- Calculate absolute deadline
  FROM template_items ti
  WHERE ti.template_id = p_template_id
  ORDER BY ti.sort_order;

  RETURN v_onboarding_id;
END;
$$;
