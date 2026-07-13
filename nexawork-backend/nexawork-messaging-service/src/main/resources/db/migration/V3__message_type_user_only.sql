-- ============================================================================
-- NexaWork Messaging Service — V3__message_type_user_only.sql
-- Alignement modèle : seuls les utilisateurs émettent des messages. On resserre
-- la contrainte CHECK à 'USER'. D'éventuels messages 'SYSTEM' résiduels (créés
-- par une version antérieure) sont d'abord reclassés en 'USER' pour ne pas violer
-- la nouvelle contrainte.
-- ============================================================================

UPDATE messages SET message_type = 'USER' WHERE message_type <> 'USER';

ALTER TABLE messages DROP CONSTRAINT IF EXISTS chk_messages_type;
ALTER TABLE messages ADD CONSTRAINT chk_messages_type CHECK (message_type IN ('USER'));
