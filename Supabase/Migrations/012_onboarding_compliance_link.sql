-- ============================================================================
-- Migration 012: Link onboarding checklist items to compliance requirements
-- Run in Supabase SQL Editor after 011. Safe to re-run.
--
-- WHY
--   Onboarding and compliance were two separate worlds. A site manager could
--   collect a CSCS card from a new starter, approve it, and still have no
--   compliance record for it, because nothing carried the card across. The
--   card then sat in the onboarding history where nothing watches it expire,
--   and somebody had to type it in a second time to get it tracked.
--
-- HOW
--   A template item can now name the compliance requirement it satisfies.
--   That choice is copied onto the checklist item when an onboarding is
--   created, the same way item_name and data_category already are, so
--   editing a template never rewrites an onboarding already in flight.
--
--   When the employer approves the item, lib/compliance/onboarding-sync.ts
--   creates the compliance record. Both columns are nullable: an item with
--   no requirement behaves exactly as it always did.
-- ============================================================================

ALTER TABLE template_items
  ADD COLUMN IF NOT EXISTS compliance_requirement_type_id UUID
  REFERENCES compliance_requirement_types(id) ON DELETE SET NULL;

ALTER TABLE checklist_items
  ADD COLUMN IF NOT EXISTS compliance_requirement_type_id UUID
  REFERENCES compliance_requirement_types(id) ON DELETE SET NULL;

-- Only used to find approved items worth syncing, so index the rows that
-- actually carry a link rather than every checklist item ever created.
CREATE INDEX IF NOT EXISTS idx_checklist_items_compliance_link
  ON checklist_items(onboarding_id)
  WHERE compliance_requirement_type_id IS NOT NULL;

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'compliance_record_from_onboarding';
