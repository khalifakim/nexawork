-- Messaging Service V3 — Conversation, ConversationParticipant, fix Channel type, fix Message (nullable channel_id)

-- 1. Nouveaux champs sur channels
ALTER TABLE channels
    ADD COLUMN IF NOT EXISTS is_system    BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_private   BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Migrer les types de canaux existants vers le nouveau schéma
--    PUBLIC/PRIVATE → GLOBAL_ORG  |  DIRECT → supprimé (remplacé par Conversation)
UPDATE channels SET channel_type = 'GLOBAL_ORG' WHERE channel_type IN ('PUBLIC', 'PRIVATE') AND project_id IS NULL;
UPDATE channels SET channel_type = 'PROJECT'    WHERE channel_type IN ('PUBLIC', 'PRIVATE') AND project_id IS NOT NULL;
DELETE FROM channels WHERE channel_type = 'DIRECT';

-- 3. Table conversations
CREATE TABLE conversations (
    id           BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT       NOT NULL,
    type         VARCHAR(20)  NOT NULL DEFAULT 'DIRECT',
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 4. Table conversation_participants
CREATE TABLE conversation_participants (
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL,
    PRIMARY KEY (conversation_id, user_id)
);

-- 5. Rendre channel_id nullable sur messages + ajouter conversation_id
ALTER TABLE messages ALTER COLUMN channel_id DROP NOT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type    VARCHAR(20) NOT NULL DEFAULT 'USER';

ALTER TABLE messages ADD CONSTRAINT chk_message_source
    CHECK (
        (channel_id IS NOT NULL AND conversation_id IS NULL) OR
        (channel_id IS NULL     AND conversation_id IS NOT NULL)
    );

CREATE INDEX idx_conversations_workspace ON conversations(workspace_id);
CREATE INDEX idx_conv_participants_conv  ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user  ON conversation_participants(user_id);
CREATE INDEX idx_messages_conversation   ON messages(conversation_id);
