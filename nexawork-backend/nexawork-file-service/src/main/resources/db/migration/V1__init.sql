-- NexaWork File Service — initial schema

CREATE TABLE stored_files (
    id                   BIGSERIAL PRIMARY KEY,
    original_name        VARCHAR(255) NOT NULL,
    stored_name          VARCHAR(512) NOT NULL,
    bucket               VARCHAR(255) NOT NULL,
    object_key           VARCHAR(512) NOT NULL,
    content_type         VARCHAR(255) NOT NULL,
    size                 BIGINT,
    uploaded_by_user_id  BIGINT NOT NULL,
    organisation_id      BIGINT,
    project_id           BIGINT,
    task_id              BIGINT,
    uploaded_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_project ON stored_files(project_id);
CREATE INDEX idx_files_task    ON stored_files(task_id);
CREATE INDEX idx_files_uploader ON stored_files(uploaded_by_user_id);
