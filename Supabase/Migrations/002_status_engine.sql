-- ============================================================
-- Task 2.5: Status Engine
-- Automatic checklist status + readiness_pct recalculation
-- ============================================================

-- 1. Core recalculation function
--    Called by the trigger (on item change) and the daily cron (for overdue sweep)
CREATE OR REPLACE FUNCTION recalculate_onboarding_status(p_onboarding_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total    INTEGER;
  v_approved INTEGER;
  v_readiness INTEGER;
  v_has_progress BOOLEAN;
BEGIN
  -- Mark overdue: deadline passed, item not yet submitted or approved
  UPDATE checklist_items
  SET status = 'overdue'
  WHERE onboarding_id = p_onboarding_id
    AND status IN ('not_started', 'in_progress')
    AND deadline IS NOT NULL
    AND deadline < CURRENT_DATE;

  -- Count totals
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'approved'),
    BOOL_OR(status IN ('in_progress', 'submitted', 'approved', 'overdue'))
  INTO v_total, v_approved, v_has_progress
  FROM checklist_items
  WHERE onboarding_id = p_onboarding_id;

  -- Calculate readiness percentage (0–100)
  v_readiness := CASE
    WHEN v_total = 0 THEN 0
    ELSE ROUND((v_approved::NUMERIC / v_total) * 100)
  END;

  -- Update onboarding instance — but never reopen a completed one
  UPDATE onboarding_instances
  SET
    readiness_pct = v_readiness,
    status = CASE
      WHEN v_readiness = 100 THEN 'complete'
      WHEN v_has_progress    THEN 'in_progress'
      ELSE status
    END
  WHERE id = p_onboarding_id
    AND status != 'complete';
END;
$$;

-- 2. Trigger wrapper function
CREATE OR REPLACE FUNCTION trigger_recalculate_onboarding_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM recalculate_onboarding_status(NEW.onboarding_id);
  RETURN NEW;
END;
$$;

-- 3. Trigger: fires after any status-affecting change on checklist_items
DROP TRIGGER IF EXISTS checklist_status_changed ON checklist_items;

CREATE TRIGGER checklist_status_changed
  AFTER INSERT OR UPDATE OF status, document_upload_id, acknowledged_at, reviewed_by
  ON checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_onboarding_status();

-- 4. Grants
GRANT EXECUTE ON FUNCTION recalculate_onboarding_status(UUID)       TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION trigger_recalculate_onboarding_status()   TO authenticated, service_role;