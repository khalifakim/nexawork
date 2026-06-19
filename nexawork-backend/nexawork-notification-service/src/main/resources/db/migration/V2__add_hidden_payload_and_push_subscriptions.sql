-- Notification Service V2 — isHidden, payload JSONB, workspaceId sur notifications + PushSubscription

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS workspace_id BIGINT,
    ADD COLUMN IF NOT EXISTS is_hidden    BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS payload      JSONB;

CREATE TABLE push_subscriptions (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    endpoint   VARCHAR(2048) NOT NULL UNIQUE,
    keys       JSONB        NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
