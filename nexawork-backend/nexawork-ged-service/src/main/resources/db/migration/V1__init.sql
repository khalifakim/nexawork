-- ============================================================================
-- NexaWork GED Service — V1__init.sql
-- Conforme V5.1 §4.4. PK UUID. access_mode (OPEN/PRIVATE/SHARED) ajouté au
-- modèle V5.1 pour porter la visibilité REF G. FolderPermission (legacy V1) non
-- implémentée (remplacée par ged_access_grants). Références cross-services sans FK.
-- ============================================================================

-- ─── ged_folders ─────────────────────────────────────────────────────────────
CREATE TABLE ged_folders (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255)    NOT NULL,
    parent_id               UUID,                       -- auto-réf logique (no-cascade)
    organisation_id         UUID            NOT NULL,
    project_id              UUID,                       -- null = GED organisation
    folder_type             VARCHAR(20)     NOT NULL DEFAULT 'USER'
        CONSTRAINT chk_ged_folders_type CHECK (folder_type IN ('USER','TASK_ATTACHMENTS')),
    access_mode             VARCHAR(10)     NOT NULL DEFAULT 'OPEN'
        CONSTRAINT chk_ged_folders_mode CHECK (access_mode IN ('OPEN','PRIVATE','SHARED')),
    created_by_user_id      UUID            NOT NULL,
    created_at              TIMESTAMP       NOT NULL DEFAULT now(),
    is_deleted              BOOLEAN         NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMP
);
CREATE INDEX idx_ged_folders_parent  ON ged_folders (parent_id);
CREATE INDEX idx_ged_folders_org     ON ged_folders (organisation_id);
CREATE INDEX idx_ged_folders_project ON ged_folders (project_id);

-- Idempotence du seeding project.created : un seul dossier racine par type et par
-- projet (autorise les sous-dossiers USER, qui ont parent_id NOT NULL).
CREATE UNIQUE INDEX uk_ged_root_folder_per_project
    ON ged_folders (project_id, folder_type)
    WHERE parent_id IS NULL AND is_deleted = FALSE;

-- ─── ged_files ───────────────────────────────────────────────────────────────
CREATE TABLE ged_files (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id               UUID            NOT NULL,
    name                    VARCHAR(255)    NOT NULL,
    file_url                VARCHAR(1024)   NOT NULL,
    file_size               BIGINT,
    content_type            VARCHAR(255),
    source_file_id          UUID,                       -- réf. StoredFile (File Service)
    project_id              UUID,
    access_mode             VARCHAR(10)     NOT NULL DEFAULT 'OPEN'
        CONSTRAINT chk_ged_files_mode CHECK (access_mode IN ('OPEN','PRIVATE','SHARED')),
    added_by_user_id        UUID            NOT NULL,
    added_at                TIMESTAMP       NOT NULL DEFAULT now(),
    is_deleted              BOOLEAN         NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMP,
    last_opened_at          TIMESTAMP,
    last_opened_by          UUID,
    CONSTRAINT fk_ged_files_folder FOREIGN KEY (folder_id)
        REFERENCES ged_folders (id) ON DELETE CASCADE
);
CREATE INDEX idx_ged_files_folder ON ged_files (folder_id);
CREATE INDEX idx_ged_files_owner  ON ged_files (added_by_user_id);

-- ─── ged_file_versions ───────────────────────────────────────────────────────
CREATE TABLE ged_file_versions (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    ged_file_id             UUID            NOT NULL,
    version_number          INTEGER         NOT NULL,
    source_file_id          UUID            NOT NULL,
    file_url                VARCHAR(1024)   NOT NULL,
    file_size               BIGINT,
    note                    VARCHAR(255),
    uploaded_by             UUID            NOT NULL,
    created_at              TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT fk_ged_file_versions_file FOREIGN KEY (ged_file_id)
        REFERENCES ged_files (id) ON DELETE CASCADE,
    CONSTRAINT uk_ged_file_versions_number UNIQUE (ged_file_id, version_number)
);
CREATE INDEX idx_ged_file_versions_file ON ged_file_versions (ged_file_id);

-- ─── ged_access_grants (polymorphe) ──────────────────────────────────────────
CREATE TABLE ged_access_grants (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type             VARCHAR(10)     NOT NULL
        CONSTRAINT chk_ged_grant_target CHECK (target_type IN ('FOLDER','FILE')),
    target_id               UUID            NOT NULL,
    grantee_type            VARCHAR(10)     NOT NULL
        CONSTRAINT chk_ged_grant_grantee CHECK (grantee_type IN ('USER','TEAM')),
    grantee_id              UUID            NOT NULL,
    access_level            VARCHAR(10)     NOT NULL
        CONSTRAINT chk_ged_grant_level CHECK (access_level IN ('READER','EDITOR')),
    granted_by              UUID            NOT NULL,
    created_at              TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT uk_ged_grant_target_grantee UNIQUE (target_type, target_id, grantee_type, grantee_id)
);
CREATE INDEX idx_ged_grants_target  ON ged_access_grants (target_type, target_id);
CREATE INDEX idx_ged_grants_grantee ON ged_access_grants (grantee_id);
