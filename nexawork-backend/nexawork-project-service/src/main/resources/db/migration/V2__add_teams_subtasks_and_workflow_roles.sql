-- Project Service V2 — Team, SubTask, ProjectMember (teamId + isProjectLead), WorkflowTransition (allowedRoles)

CREATE TABLE teams (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE project_members
    ADD COLUMN IF NOT EXISTS team_id          BIGINT REFERENCES teams(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_project_lead  BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE workflow_transitions
    ADD COLUMN IF NOT EXISTS allowed_roles JSONB NOT NULL DEFAULT '[]';

ALTER TABLE workflow_statuses
    ADD COLUMN IF NOT EXISTS is_initial BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS color      VARCHAR(50) NOT NULL DEFAULT '#6c757d';

CREATE TABLE sub_tasks (
    id           BIGSERIAL PRIMARY KEY,
    task_id      BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_by   BIGINT NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_project    ON teams(project_id);
CREATE INDEX idx_subtasks_task    ON sub_tasks(task_id);
CREATE INDEX idx_members_team     ON project_members(team_id);
