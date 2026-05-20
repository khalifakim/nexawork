-- NexaWork Meeting Service — initial schema

CREATE TABLE calls (
    id               BIGSERIAL PRIMARY KEY,
    topic            VARCHAR(255) NOT NULL,
    room_name        VARCHAR(255) NOT NULL UNIQUE,
    organisation_id  BIGINT NOT NULL,
    project_id       BIGINT,
    host_user_id     BIGINT NOT NULL,
    status           VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    scheduled_at     TIMESTAMP,
    started_at       TIMESTAMP,
    ended_at         TIMESTAMP,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE call_participants (
    id          BIGSERIAL PRIMARY KEY,
    call_id     BIGINT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL,
    joined_at   TIMESTAMP,
    left_at     TIMESTAMP
);

CREATE TABLE external_guests (
    id            BIGSERIAL PRIMARY KEY,
    call_id       BIGINT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    email         VARCHAR(255) NOT NULL,
    display_name  VARCHAR(255) NOT NULL,
    guest_token   VARCHAR(512) NOT NULL UNIQUE,
    used          BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_calls_org       ON calls(organisation_id);
CREATE INDEX idx_calls_project   ON calls(project_id);
CREATE INDEX idx_participants_call ON call_participants(call_id);
