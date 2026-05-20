-- NexaWork Notification Service — initial schema

CREATE TABLE notifications (
    id                BIGSERIAL PRIMARY KEY,
    recipient_user_id BIGINT NOT NULL,
    type              VARCHAR(100) NOT NULL,
    title             VARCHAR(255) NOT NULL,
    body              TEXT,
    target_url        VARCHAR(1024),
    read              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_recipient ON notifications(recipient_user_id);
CREATE INDEX idx_notif_unread    ON notifications(recipient_user_id, read) WHERE read = FALSE;
