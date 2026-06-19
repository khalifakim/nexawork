CREATE TABLE message_mentions (
    id           BIGSERIAL PRIMARY KEY,
    message_id   BIGINT       NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    mention_type VARCHAR(20)  NOT NULL,
    target_id    BIGINT,
    target_text  VARCHAR(100),
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mentions_message ON message_mentions(message_id);
CREATE INDEX idx_mentions_user    ON message_mentions(target_id) WHERE mention_type = 'USER';
