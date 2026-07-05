-- ============================================================================
-- NexaWork File Service — V1__init.sql
-- Conforme V5.1 §4.3 / §5.3. Entité autonome (aucune FK) : identifiants logiques
-- cross-services (organisation_id, project_id, task_id) en colonnes UUID nullables.
-- ============================================================================

CREATE TABLE stored_files (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name           VARCHAR(255)    NOT NULL,
    stored_name             VARCHAR(512)    NOT NULL,
    bucket                  VARCHAR(255)    NOT NULL,
    object_key              VARCHAR(512)    NOT NULL,
    content_type            VARCHAR(255)    NOT NULL,
    size                    BIGINT,
    sha256                  VARCHAR(64),
    uploaded_by_user_id     UUID            NOT NULL,
    organisation_id         UUID,
    project_id              UUID,
    task_id                 UUID,
    uploaded_at             TIMESTAMP       NOT NULL DEFAULT now()
);

CREATE INDEX idx_stored_files_organisation ON stored_files (organisation_id);
CREATE INDEX idx_stored_files_project      ON stored_files (project_id);
CREATE INDEX idx_stored_files_task         ON stored_files (task_id);
CREATE INDEX idx_stored_files_uploader     ON stored_files (uploaded_by_user_id);
