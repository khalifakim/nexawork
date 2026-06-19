CREATE TABLE ged_file_versions (
    id              BIGSERIAL PRIMARY KEY,
    ged_file_id     BIGINT NOT NULL REFERENCES ged_files(id) ON DELETE CASCADE,
    version_number  INT NOT NULL,
    source_file_id  BIGINT NOT NULL,
    file_url        VARCHAR(1024) NOT NULL,
    file_size       BIGINT,
    uploaded_by     BIGINT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_file_version UNIQUE (ged_file_id, version_number)
);

CREATE TABLE ged_access_grants (
    id          BIGSERIAL PRIMARY KEY,
    folder_id   BIGINT NOT NULL REFERENCES ged_folders(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL,
    grant_level VARCHAR(50) NOT NULL DEFAULT 'READ',
    granted_by  BIGINT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_access_grant UNIQUE (folder_id, user_id)
);

CREATE INDEX idx_file_versions_file   ON ged_file_versions(ged_file_id);
CREATE INDEX idx_access_grants_folder ON ged_access_grants(folder_id);
CREATE INDEX idx_access_grants_user   ON ged_access_grants(user_id);
