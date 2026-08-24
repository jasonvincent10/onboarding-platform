-- Migration 005: allow document_deleted as an audit_action value, for the
-- new "My Documents" page where an employee can delete an unlinked document.

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'document_deleted';
