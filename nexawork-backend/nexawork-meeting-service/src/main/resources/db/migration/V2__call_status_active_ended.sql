-- ============================================================================
-- NexaWork Meeting Service — V2__call_status_active_ended.sql
-- Alignement modèle : une réunion est lancée en direct (ACTIVE) puis terminée
-- (ENDED). Les valeurs 'SCHEDULED' et 'CANCELLED' (planification à l'avance) n'ont
-- jamais été produites → on resserre la contrainte CHECK à ('ACTIVE','ENDED').
-- ============================================================================

ALTER TABLE calls DROP CONSTRAINT IF EXISTS chk_calls_status;
ALTER TABLE calls ADD CONSTRAINT chk_calls_status CHECK (status IN ('ACTIVE','ENDED'));
