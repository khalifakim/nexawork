-- ============================================================================
-- NexaWork Messaging Service — V1__init.sql
-- Conforme V5.1 §4.5. PK UUID. message : XOR channel_id / conversation_id (CHECK).
-- message_mentions.is_read + conversation_participants.is_read ajoutés au modèle
-- V5.1 (état lu/non-lu de la vue « Mentions reçues »). Références cross-services
-- (organisation_id, project_id, sender_user_id, user_id) sans FK.
-- ============================================================================

-- ─── channels ───────────────────────────────────────────────────────────────
CREATE TABLE channels (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255)    NOT NULL,
    icon                    VARCHAR(20)     NOT NULL DEFAULT 'HASH'
        CONSTRAINT chk_channels_icon CHECK (icon IN ('HASH','BELL')),
    channel_type            VARCHAR(50)     NOT NULL
        CONSTRAINT chk_channels_type CHECK (channel_type IN ('GLOBAL_ORG','PROJECT')),
    organisation_id         UUID            NOT NULL,
    project_id              UUID,
    created_by_user_id      UUID,
    is_system               BOOLEAN         NOT NULL DEFAULT FALSE,
    readonly                BOOLEAN         NOT NULL DEFAULT FALSE,
    is_private              BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP       NOT NULL DEFAULT now()
);
CREATE INDEX idx_channels_org     ON channels (organisation_id);
CREATE INDEX idx_channels_project ON channels (project_id);

-- ─── channel_members (canaux privés) ─────────────────────────────────────────
CREATE TABLE channel_members (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id              UUID            NOT NULL,
    user_id                 UUID            NOT NULL,
    access_level            VARCHAR(20)     NOT NULL DEFAULT 'EDITOR'
        CONSTRAINT chk_channel_members_level CHECK (access_level IN ('READER','EDITOR')),
    joined_at               TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT fk_channel_members_channel FOREIGN KEY (channel_id)
        REFERENCES channels (id) ON DELETE CASCADE,
    CONSTRAINT uk_channel_members_channel_user UNIQUE (channel_id, user_id)
);
CREATE INDEX idx_channel_members_channel ON channel_members (channel_id);
CREATE INDEX idx_channel_members_user    ON channel_members (user_id);

-- ─── conversations ───────────────────────────────────────────────────────────
CREATE TABLE conversations (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id            UUID            NOT NULL,
    type                    VARCHAR(20)     NOT NULL DEFAULT 'DIRECT',
    created_at              TIMESTAMP       NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversations_workspace ON conversations (workspace_id);

-- ─── conversation_participants (PK composite) ────────────────────────────────
CREATE TABLE conversation_participants (
    conversation_id         UUID            NOT NULL,
    user_id                 UUID            NOT NULL,
    is_read                 BOOLEAN         NOT NULL DEFAULT FALSE,
    PRIMARY KEY (conversation_id, user_id),
    CONSTRAINT fk_conv_participants_conversation FOREIGN KEY (conversation_id)
        REFERENCES conversations (id) ON DELETE CASCADE
);
CREATE INDEX idx_conv_participants_user ON conversation_participants (user_id);

-- ─── messages (XOR canal / conversation) ─────────────────────────────────────
CREATE TABLE messages (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id              UUID,
    conversation_id         UUID,
    sender_user_id          UUID            NOT NULL,
    content                 TEXT            NOT NULL,
    attachment_url          VARCHAR(1024),
    attachment_name         VARCHAR(255),
    message_type            VARCHAR(20)     NOT NULL DEFAULT 'USER'
        CONSTRAINT chk_messages_type CHECK (message_type IN ('USER','SYSTEM')),
    is_deleted              BOOLEAN         NOT NULL DEFAULT FALSE,
    sent_at                 TIMESTAMP       NOT NULL DEFAULT now(),
    edited                  BOOLEAN         NOT NULL DEFAULT FALSE,
    read_at                 TIMESTAMPTZ,
    CONSTRAINT fk_messages_channel FOREIGN KEY (channel_id)
        REFERENCES channels (id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id)
        REFERENCES conversations (id) ON DELETE CASCADE,
    -- XOR : exactement une source (canal OU conversation).
    CONSTRAINT chk_message_source CHECK (
        (channel_id IS NOT NULL AND conversation_id IS NULL)
        OR (channel_id IS NULL AND conversation_id IS NOT NULL)
    )
);
CREATE INDEX idx_messages_channel      ON messages (channel_id, sent_at);
CREATE INDEX idx_messages_conversation ON messages (conversation_id, sent_at);
CREATE INDEX idx_messages_sender       ON messages (sender_user_id);

-- ─── message_mentions ────────────────────────────────────────────────────────
CREATE TABLE message_mentions (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id              UUID            NOT NULL,
    mention_type            VARCHAR(20)     NOT NULL
        CONSTRAINT chk_mentions_type CHECK (mention_type IN ('USER','TASK','DOCUMENT','CHANNEL')),
    target_id               UUID,
    target_text             VARCHAR(100),
    is_read                 BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT fk_message_mentions_message FOREIGN KEY (message_id)
        REFERENCES messages (id) ON DELETE CASCADE
);
CREATE INDEX idx_message_mentions_message ON message_mentions (message_id);
CREATE INDEX idx_message_mentions_target  ON message_mentions (target_id, mention_type);
