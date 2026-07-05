-- ============================================================================
-- NexaWork Meeting Service — V1__init.sql
-- Conforme V5.1 §4.6. PK UUID. Références cross-services (organisation_id,
-- project_id, host_user_id, user_id, file_id) sans FK. meeting_messages /
-- meeting_files : tables créées (modèle §4.6) ; endpoints différés (chat/fichiers
-- de réunion captés côté client, hors §13.6 Phase 9).
-- ============================================================================

-- ─── calls ───────────────────────────────────────────────────────────────────
CREATE TABLE calls (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    topic                   VARCHAR(255)    NOT NULL,
    room_name               VARCHAR(255)    NOT NULL,
    organisation_id         UUID            NOT NULL,
    project_id              UUID,
    host_user_id            UUID            NOT NULL,
    status                  VARCHAR(50)     NOT NULL
        CONSTRAINT chk_calls_status CHECK (status IN ('SCHEDULED','ACTIVE','ENDED','CANCELLED')),
    scheduled_at            TIMESTAMP,
    started_at              TIMESTAMP,
    ended_at                TIMESTAMP,
    created_at              TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT uk_calls_room_name UNIQUE (room_name)
);
CREATE INDEX idx_calls_org  ON calls (organisation_id);
CREATE INDEX idx_calls_host ON calls (host_user_id);

-- ─── call_participants ───────────────────────────────────────────────────────
CREATE TABLE call_participants (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id                 UUID            NOT NULL,
    user_id                 UUID            NOT NULL,
    joined_at               TIMESTAMP,
    left_at                 TIMESTAMP,
    invited_explicitly      BOOLEAN         NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_call_participants_call FOREIGN KEY (call_id)
        REFERENCES calls (id) ON DELETE CASCADE
);
CREATE INDEX idx_call_participants_call ON call_participants (call_id);
CREATE INDEX idx_call_participants_user ON call_participants (user_id);
-- REF A : accélère la recherche des participations « en cours ».
CREATE INDEX idx_call_participants_ongoing ON call_participants (user_id) WHERE left_at IS NULL;

-- ─── external_guests ─────────────────────────────────────────────────────────
CREATE TABLE external_guests (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id                 UUID            NOT NULL,
    email                   VARCHAR(255)    NOT NULL,
    display_name            VARCHAR(255)    NOT NULL,
    guest_token             VARCHAR(512)    NOT NULL,
    used                    BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT fk_external_guests_call FOREIGN KEY (call_id)
        REFERENCES calls (id) ON DELETE CASCADE,
    CONSTRAINT uk_external_guests_token UNIQUE (guest_token)
);
CREATE INDEX idx_external_guests_call ON external_guests (call_id);

-- ─── meeting_hidden (masquage historique, PK composite) ──────────────────────
CREATE TABLE meeting_hidden (
    call_id                 UUID            NOT NULL,
    user_id                 UUID            NOT NULL,
    PRIMARY KEY (call_id, user_id),
    CONSTRAINT fk_meeting_hidden_call FOREIGN KEY (call_id)
        REFERENCES calls (id) ON DELETE CASCADE
);
CREATE INDEX idx_meeting_hidden_user ON meeting_hidden (user_id);

-- ─── meeting_messages (chat de réunion — endpoints différés) ─────────────────
CREATE TABLE meeting_messages (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id                 UUID            NOT NULL,
    author_id               UUID,
    author_name             VARCHAR(255)    NOT NULL,
    content                 TEXT            NOT NULL,
    sent_at                 TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT fk_meeting_messages_call FOREIGN KEY (call_id)
        REFERENCES calls (id) ON DELETE CASCADE
);
CREATE INDEX idx_meeting_messages_call ON meeting_messages (call_id);

-- ─── meeting_files (fichiers partagés en réunion — endpoints différés) ───────
CREATE TABLE meeting_files (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id                 UUID            NOT NULL,
    file_id                 UUID            NOT NULL,
    shared_by               UUID            NOT NULL,
    shared_at               TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT fk_meeting_files_call FOREIGN KEY (call_id)
        REFERENCES calls (id) ON DELETE CASCADE
);
CREATE INDEX idx_meeting_files_call ON meeting_files (call_id);
