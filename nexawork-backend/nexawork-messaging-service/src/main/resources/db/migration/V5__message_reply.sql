-- Réponse à un message précis (type WhatsApp) : un message peut citer un autre
-- message du même fil. Auto-référence nullable ; si le message cité est purgé un
-- jour (hard delete), la citation retombe à NULL plutôt que de bloquer.
ALTER TABLE messages
    ADD COLUMN reply_to_message_id UUID;

ALTER TABLE messages
    ADD CONSTRAINT fk_messages_reply_to
        FOREIGN KEY (reply_to_message_id) REFERENCES messages (id) ON DELETE SET NULL;

CREATE INDEX idx_messages_reply_to ON messages (reply_to_message_id);
