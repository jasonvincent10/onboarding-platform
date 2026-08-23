-- ============================================================================
-- Migration 004: Team member invitations
-- Lets an existing employer_member invite a colleague to join the same
-- employer account. Mirrors the onboarding_instances invitation_token
-- pattern -- token is the credential, looked up by adminClient, identity on
-- accept always comes from the session, never a param.
-- ============================================================================

CREATE TABLE employer_invitations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id       UUID NOT NULL REFERENCES employer_accounts(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  role              TEXT NOT NULL DEFAULT 'admin',        -- admin | reviewer (never 'owner' via invite)
  invitation_token  UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  invited_by        UUID NOT NULL REFERENCES auth.users(id),
  status            TEXT NOT NULL DEFAULT 'pending',       -- pending | accepted | revoked

  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
  accepted_at       TIMESTAMPTZ
);

CREATE INDEX idx_employer_invitations_employer ON employer_invitations(employer_id);
CREATE INDEX idx_employer_invitations_token ON employer_invitations(invitation_token);

ALTER TABLE employer_invitations ENABLE ROW LEVEL SECURITY;

-- Members can see and manage invitations for their own employer only.
-- Actual accept/revoke logic runs through adminClient in server actions
-- (matching this project's established pattern elsewhere), so these
-- policies are a baseline safety net for direct client access, not the
-- primary enforcement.
CREATE POLICY "employer_invitations_select" ON employer_invitations
  FOR SELECT USING (
    employer_id = get_my_employer_id()
  );

CREATE POLICY "employer_invitations_insert" ON employer_invitations
  FOR INSERT WITH CHECK (
    employer_id = get_my_employer_id()
  );

CREATE POLICY "employer_invitations_update" ON employer_invitations
  FOR UPDATE USING (
    employer_id = get_my_employer_id()
  );

-- New audit_action values for the invite lifecycle
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'team_member_invited';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'team_member_joined';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'team_invitation_revoked';
