-- ============================================================================
-- NexaWork Messaging Service — V3__message_type_user_only.sql
-- Alignement modèle : seuls les utilisateurs émettent des messages. La valeur
-- 'SYSTEM' (messages générés par la plateforme) n'a jamais été produite → on
-- resserre la contrainte CHECK à 'USER'.
-- ============================================================================

ALTER TABLE messages DROP CONSTRAINT IF EXISTS chk_messages_type;
ALTER TABLE messages ADD CONSTRAINT chk_messages_type CHECK (message_type IN ('USER'));
