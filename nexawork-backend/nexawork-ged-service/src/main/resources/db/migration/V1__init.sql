-- NexaWork GED Service — initial schema

CREATE TABLE ged_folders (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    parent_id           BIGINT,
    organisation_id     BIGINT NOT NULL,
    project_id          BIGINT,
    created_by_user_id  BIGINT NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE folder_permissions (
    id          BIGSERIAL PRIMARY KEY,
    folder_id   BIGINT NOT NULL REFERENCES ged_folders(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL,
    level       VARCHAR(50) NOT NULL DEFAULT 'READ',
    CONSTRAINT uq_folder_permission UNIQUE (folder_id, user_id)
);

CREATE TABLE ged_files (
    id                  BIGSERIAL PRIMARY KEY,
    folder_id           BIGINT NOT NULL REFERENCES ged_folders(id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    file_url            VARCHAR(1024) NOT NULL,
    file_size           BIGINT,
    content_type        VARCHAR(255),
    source_file_id      BIGINT,
    task_id             BIGINT,
    project_id          BIGINT,
    added_by_user_id    BIGINT NOT NULL,
    added_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ged_folders_org     ON ged_folders(organisation_id);
CREATE INDEX idx_ged_folders_project ON ged_folders(project_id);
CREATE INDEX idx_ged_folders_parent  ON ged_folders(parent_id);
CREATE INDEX idx_ged_files_folder    ON ged_files(folder_id);
CREATE INDEX idx_ged_files_task      ON ged_files(task_id);
