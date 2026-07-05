-- ============================================================================
-- NexaWork Notification Service — V1__init.sql
-- Conforme V5.1 §4.7. PK UUID. Références cross-services (recipient_user_id,
-- workspace_id, user_id) sans FK. payload / keys en JSONB.
-- ============================================================================

-- ─── notifications ───────────────────────────────────────────────────────────
CREATE TABLE notifications (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id       UUID            NOT NULL,
    type                    VARCHAR(100)    NOT NULL,
    title                   VARCHAR(255)    NOT NULL,
    body                    TEXT,
    target_url              VARCHAR(1024),
    read                    BOOLEAN         NOT NULL DEFAULT FALSE,
    is_hidden               BOOLEAN         NOT NULL DEFAULT FALSE,
    workspace_id            UUID,
    payload                 JSONB,
    created_at              TIMESTAMP       NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_recipient ON notifications (recipient_user_id, is_hidden, created_at DESC);
CREATE INDEX idx_notifications_unread    ON notifications (recipient_user_id, read) WHERE is_hidden = FALSE;

-- ─── push_subscriptions ──────────────────────────────────────────────────────
CREATE TABLE push_subscriptions (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID            NOT NULL,
    endpoint                VARCHAR(2048)   NOT NULL,
    keys                    JSONB           NOT NULL,
    created_at              TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT uk_push_subscriptions_endpoint UNIQUE (endpoint)
);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions (user_id);
