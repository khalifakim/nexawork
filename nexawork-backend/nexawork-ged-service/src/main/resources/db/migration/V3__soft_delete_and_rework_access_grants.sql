-- GED Service V3 — soft delete sur folders+files, last_opened, rework ged_access_grants polymorphe

ALTER TABLE ged_folders
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE ged_files
    ADD COLUMN IF NOT EXISTS is_deleted      BOOLEAN   NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_opened_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_opened_by  BIGINT;

-- Rework ged_access_grants : remplacer la structure folder-only/user-only
-- par une structure polymorphe (FOLDER|FILE) x (USER|TEAM)
DROP TABLE IF EXISTS ged_access_grants;

CREATE TABLE ged_access_grants (
    id           BIGSERIAL PRIMARY KEY,
    target_type  VARCHAR(10)  NOT NULL CHECK (target_type IN ('FOLDER', 'FILE')),
    target_id    BIGINT       NOT NULL,
    grantee_type VARCHAR(10)  NOT NULL CHECK (grantee_type IN ('USER', 'TEAM')),
    grantee_id   BIGINT       NOT NULL,
    access_level VARCHAR(10)  NOT NULL DEFAULT 'READER' CHECK (access_level IN ('READER', 'EDITOR')),
    granted_by   BIGINT       NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_access_grants_target  ON ged_access_grants(target_type, target_id);
CREATE INDEX idx_access_grants_grantee ON ged_access_grants(grantee_type, grantee_id);
