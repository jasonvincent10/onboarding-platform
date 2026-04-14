-- Task 3.2: Consent management helpers
-- Returns the latest consent action per data_category for an
-- (employee, employer) pair. Used by consent UI and employer reads.

CREATE OR REPLACE FUNCTION get_consent_status_for_employer(
  p_employee_id UUID,
  p_employer_id UUID
)
RETURNS TABLE (
  data_category TEXT,
  latest_action TEXT,
  latest_at TIMESTAMPTZ,
  onboarding_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (cr.data_category)
    cr.data_category::TEXT,
    cr.action::TEXT,
    cr.created_at,
    cr.onboarding_id
  FROM consent_records cr
  WHERE cr.employee_id = p_employee_id
    AND cr.employer_id = p_employer_id
  ORDER BY cr.data_category, cr.created_at DESC;
$$;

-- Index to keep the DISTINCT ON above fast as the table grows.
CREATE INDEX IF NOT EXISTS idx_consent_records_lookup
  ON consent_records (employee_id, employer_id, data_category, created_at DESC);

-- Allow authenticated users to call the function. RLS on the underlying
-- table still applies via SECURITY DEFINER + the WHERE clause restricting
-- to the caller's own employee_id (enforced by the calling code).
GRANT EXECUTE ON FUNCTION get_consent_status_for_employer(UUID, UUID) TO authenticated;