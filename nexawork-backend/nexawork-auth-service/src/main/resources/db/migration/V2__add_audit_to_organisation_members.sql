ALTER TABLE organisation_members
    ADD COLUMN IF NOT EXISTS created_by         VARCHAR(255),
    ADD COLUMN IF NOT EXISTS created_date       TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_modified_by   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS last_modified_date TIMESTAMP;
