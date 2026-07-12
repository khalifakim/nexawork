-- ============================================================================
-- NexaWork Messaging Service — V2__message_attachments.sql
-- Pièces jointes multiples par message (V5.1 §4.5). Remplace le couple de
-- colonnes messages.attachment_url / attachment_name (une seule PJ) par une
-- relation un-à-plusieurs, à l'image de comment_attachments (Project Service).
-- Les colonnes héritées restent en place (compat lecture des anciens messages).
-- ============================================================================

CREATE TABLE message_attachments (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id          UUID            NOT NULL,
    file_name           VARCHAR(255),
    file_url            VARCHAR(1024)   NOT NULL,
    uploader_user_id    UUID,
    uploaded_at         TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT fk_message_attachments_message FOREIGN KEY (message_id)
        REFERENCES messages (id) ON DELETE CASCADE
);
CREATE INDEX idx_message_attachments_message ON message_attachments (message_id);
