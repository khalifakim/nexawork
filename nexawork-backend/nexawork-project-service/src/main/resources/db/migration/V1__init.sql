-- NexaWork Project Service — initial schema

CREATE TABLE projects (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    organisation_id BIGINT NOT NULL,
    owner_user_id   BIGINT NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_by      VARCHAR(255),
    created_date    TIMESTAMP,
    last_modified_by   VARCHAR(255),
    last_modified_date TIMESTAMP
);

CREATE TABLE project_members (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL,
    project_role VARCHAR(50) NOT NULL DEFAULT 'DEVELOPER',
    joined_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_member UNIQUE (project_id, user_id)
);

CREATE TABLE workflow_statuses (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    position    INTEGER NOT NULL,
    is_final    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE workflow_transitions (
    id              BIGSERIAL PRIMARY KEY,
    from_status_id  BIGINT NOT NULL REFERENCES workflow_statuses(id) ON DELETE CASCADE,
    to_status_id    BIGINT NOT NULL REFERENCES workflow_statuses(id) ON DELETE CASCADE
);

CREATE TABLE tasks (
    id              BIGSERIAL PRIMARY KEY,
    project_id      BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status_id       BIGINT REFERENCES workflow_statuses(id),
    priority        VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    assignee_user_id BIGINT,
    due_date        DATE,
    created_by      VARCHAR(255),
    created_date    TIMESTAMP,
    last_modified_by   VARCHAR(255),
    last_modified_date TIMESTAMP
);

CREATE TABLE task_comments (
    id              BIGSERIAL PRIMARY KEY,
    task_id         BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_user_id  BIGINT NOT NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE task_attachments (
    id                  BIGSERIAL PRIMARY KEY,
    task_id             BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    file_name           VARCHAR(255) NOT NULL,
    file_url            VARCHAR(1024) NOT NULL,
    file_size           BIGINT,
    content_type        VARCHAR(255),
    uploaded_by_user_id BIGINT NOT NULL,
    uploaded_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_org     ON projects(organisation_id);
CREATE INDEX idx_tasks_project    ON tasks(project_id);
CREATE INDEX idx_tasks_assignee   ON tasks(assignee_user_id);
CREATE INDEX idx_comments_task    ON task_comments(task_id);
