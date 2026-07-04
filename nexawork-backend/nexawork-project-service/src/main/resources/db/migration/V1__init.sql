-- ============================================================================
-- NexaWork Project Service — V1__init.sql
-- Conforme V5.1 §4.2 / §5.2 (modèle V5). PK UUID. Audit sur projects et tasks
-- (Auditable) ; les autres entités portent leur propre created_at.
-- Références logiques cross-services (organisation_id, owner_user_id, user_id,
-- assignee_id, responsible_user_id) : colonnes UUID sans FK.
-- ============================================================================

-- ─── projects ───────────────────────────────────────────────────────────────
CREATE TABLE projects (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255)    NOT NULL,
    description             TEXT,
    color                   VARCHAR(50),
    organisation_id         UUID            NOT NULL,
    owner_user_id           UUID            NOT NULL,
    status                  VARCHAR(50)     NOT NULL DEFAULT 'ACTIVE',
    start_date              DATE,
    end_date                DATE,
    enforce_workflow_order  BOOLEAN         NOT NULL DEFAULT FALSE,
    created_by              VARCHAR(255),
    created_date            TIMESTAMP,
    last_modified_by        VARCHAR(255),
    last_modified_date      TIMESTAMP
);
CREATE INDEX idx_projects_organisation ON projects (organisation_id);
CREATE INDEX idx_projects_owner        ON projects (owner_user_id);

-- ─── teams ──────────────────────────────────────────────────────────────────
CREATE TABLE teams (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID            NOT NULL,
    name                    VARCHAR(255)    NOT NULL,
    color                   VARCHAR(50),
    created_at              TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT fk_teams_project FOREIGN KEY (project_id)
        REFERENCES projects (id) ON DELETE CASCADE
);
CREATE INDEX idx_teams_project ON teams (project_id);

-- ─── project_members ─────────────────────────────────────────────────────────
CREATE TABLE project_members (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID            NOT NULL,
    user_id                 UUID            NOT NULL,
    project_role            VARCHAR(50)     NOT NULL DEFAULT 'DEVELOPER',
    team_id                 UUID,
    is_project_lead         BOOLEAN         NOT NULL DEFAULT FALSE,
    joined_at               TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT fk_project_members_project FOREIGN KEY (project_id)
        REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_project_members_team FOREIGN KEY (team_id)
        REFERENCES teams (id) ON DELETE SET NULL,
    CONSTRAINT uk_project_members_project_user UNIQUE (project_id, user_id)
);
CREATE INDEX idx_project_members_project ON project_members (project_id);
CREATE INDEX idx_project_members_user    ON project_members (user_id);

-- ─── workflow_statuses ───────────────────────────────────────────────────────
CREATE TABLE workflow_statuses (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID            NOT NULL,
    name                    VARCHAR(100)    NOT NULL,
    category                VARCHAR(20)     NOT NULL DEFAULT 'NOT_STARTED',
    position                INTEGER         NOT NULL,
    is_initial              BOOLEAN         NOT NULL DEFAULT FALSE,
    is_final                BOOLEAN         NOT NULL DEFAULT FALSE,
    color                   VARCHAR(50)     NOT NULL DEFAULT '#6c757d',
    CONSTRAINT fk_workflow_statuses_project FOREIGN KEY (project_id)
        REFERENCES projects (id) ON DELETE CASCADE
);
CREATE INDEX idx_workflow_statuses_project ON workflow_statuses (project_id);

-- ─── workflow_transitions ────────────────────────────────────────────────────
-- from_status CASCADE ; to_status protégé (RESTRICT) contre la suppression d'un
-- statut encore cible d'une transition (V5.1 §4.2 « no-cascade »).
CREATE TABLE workflow_transitions (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    from_status_id          UUID            NOT NULL,
    to_status_id            UUID            NOT NULL,
    responsible_type        VARCHAR(20)     NOT NULL DEFAULT 'ALL',
    responsible_user_id     UUID,
    allowed_roles           JSONB           DEFAULT '[]'::jsonb,
    CONSTRAINT fk_workflow_transitions_from FOREIGN KEY (from_status_id)
        REFERENCES workflow_statuses (id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_transitions_to FOREIGN KEY (to_status_id)
        REFERENCES workflow_statuses (id) ON DELETE RESTRICT,
    CONSTRAINT uk_workflow_transitions_pair UNIQUE (from_status_id, to_status_id)
);
CREATE INDEX idx_workflow_transitions_from ON workflow_transitions (from_status_id);
CREATE INDEX idx_workflow_transitions_to   ON workflow_transitions (to_status_id);

-- ─── tasks ──────────────────────────────────────────────────────────────────
-- CHECK : assignee_id NULL ssi assignee_type NULL (assignation polymorphe §4.2).
-- status_id : SET NULL si le statut est supprimé (la tâche redevient non positionnée).
CREATE TABLE tasks (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID            NOT NULL,
    title                   VARCHAR(255)    NOT NULL,
    description             TEXT,
    status_id               UUID,
    priority                VARCHAR(50)     NOT NULL DEFAULT 'MEDIUM',
    assignee_type           VARCHAR(10),
    assignee_id             UUID,
    start_date              DATE,
    due_date                DATE,
    estimate                VARCHAR(50),
    created_by              VARCHAR(255),
    created_date            TIMESTAMP,
    last_modified_by        VARCHAR(255),
    last_modified_date      TIMESTAMP,
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id)
        REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_status FOREIGN KEY (status_id)
        REFERENCES workflow_statuses (id) ON DELETE SET NULL,
    CONSTRAINT chk_tasks_assignee CHECK (
        (assignee_type IS NULL AND assignee_id IS NULL)
        OR (assignee_type IS NOT NULL AND assignee_id IS NOT NULL)
    )
);
CREATE INDEX idx_tasks_project  ON tasks (project_id);
CREATE INDEX idx_tasks_status   ON tasks (status_id);
CREATE INDEX idx_tasks_assignee ON tasks (assignee_id);
CREATE INDEX idx_tasks_due_date ON tasks (due_date);

-- ─── sub_tasks ───────────────────────────────────────────────────────────────
CREATE TABLE sub_tasks (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id                 UUID            NOT NULL,
    title                   VARCHAR(255)    NOT NULL,
    is_completed            BOOLEAN         NOT NULL DEFAULT FALSE,
    assignee_user_id        UUID,
    created_by              UUID            NOT NULL,
    created_at              TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT fk_sub_tasks_task FOREIGN KEY (task_id)
        REFERENCES tasks (id) ON DELETE CASCADE
);
CREATE INDEX idx_sub_tasks_task ON sub_tasks (task_id);

-- ─── task_comments ───────────────────────────────────────────────────────────
CREATE TABLE task_comments (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id                 UUID            NOT NULL,
    author_user_id          UUID            NOT NULL,
    content                 TEXT            NOT NULL,
    created_at              TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT fk_task_comments_task FOREIGN KEY (task_id)
        REFERENCES tasks (id) ON DELETE CASCADE
);
CREATE INDEX idx_task_comments_task ON task_comments (task_id);

-- ─── task_attachments ────────────────────────────────────────────────────────
CREATE TABLE task_attachments (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id                 UUID            NOT NULL,
    file_name               VARCHAR(255)    NOT NULL,
    file_url                VARCHAR(1024)   NOT NULL,
    file_size               BIGINT,
    content_type            VARCHAR(255),
    uploaded_by_user_id     UUID            NOT NULL,
    uploaded_at             TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT fk_task_attachments_task FOREIGN KEY (task_id)
        REFERENCES tasks (id) ON DELETE CASCADE
);
CREATE INDEX idx_task_attachments_task ON task_attachments (task_id);
