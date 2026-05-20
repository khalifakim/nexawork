-- NexaWork Messaging Service — initial schema

CREATE TABLE channels (
    id               BIGSERIAL PRIMARY KEY,
    name             VARCHAR(255) NOT NULL,
    channel_type     VARCHAR(50) NOT NULL DEFAULT 'PUBLIC',
    organisation_id  BIGINT NOT NULL,
    project_id       BIGINT,
    created_by_user_id BIGINT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE channel_members (
    id          BIGSERIAL PRIMARY KEY,
    channel_id  BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL,
    joined_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_channel_member UNIQUE (channel_id, user_id)
);

CREATE TABLE messages (
    id               BIGSERIAL PRIMARY KEY,
    channel_id       BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    sender_user_id   BIGINT NOT NULL,
    content          TEXT NOT NULL,
    attachment_url   VARCHAR(1024),
    attachment_name  VARCHAR(255),
    sent_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    edited           BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_channels_org     ON channels(organisation_id);
CREATE INDEX idx_channels_project ON channels(project_id);
CREATE INDEX idx_messages_channel ON messages(channel_id);
CREATE INDEX idx_messages_sent    ON messages(sent_at DESC);
