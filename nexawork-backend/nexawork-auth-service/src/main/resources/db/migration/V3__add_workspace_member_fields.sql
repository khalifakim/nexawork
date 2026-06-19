-- Auth Service V3 — champs WorkspaceMember (isOwner, isDeactivated) + invitedBy + role sur invitations

ALTER TABLE organisation_members
    ADD COLUMN IF NOT EXISTS is_owner       BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_deactivated BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE invitations
    ADD COLUMN IF NOT EXISTS role       VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    ADD COLUMN IF NOT EXISTS invited_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
