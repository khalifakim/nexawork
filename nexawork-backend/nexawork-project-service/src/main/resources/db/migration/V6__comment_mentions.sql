-- Mentions d'utilisateurs dans les commentaires de tâches (notif + « Mentions reçues »).
CREATE TABLE comment_mentions (
    id                UUID PRIMARY KEY,
    comment_id        UUID NOT NULL REFERENCES task_comments (id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL,
    target_text       VARCHAR(255),
    is_read           BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_comment_mentions_user ON comment_mentions (mentioned_user_id);
