-- Meeting Service V3 — renommer lobby_bypass→invited_explicitly, ajouter MeetingMessage et MeetingFile

ALTER TABLE call_participants RENAME COLUMN lobby_bypass TO invited_explicitly;

CREATE TABLE meeting_messages (
    id           BIGSERIAL PRIMARY KEY,
    call_id      BIGINT        NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    author_id    BIGINT,
    author_name  VARCHAR(255)  NOT NULL,
    content      TEXT          NOT NULL,
    sent_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE meeting_files (
    id         BIGSERIAL PRIMARY KEY,
    call_id    BIGINT    NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    file_id    BIGINT    NOT NULL,
    shared_by  BIGINT    NOT NULL,
    shared_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meeting_messages_call ON meeting_messages(call_id);
CREATE INDEX idx_meeting_files_call    ON meeting_files(call_id);
