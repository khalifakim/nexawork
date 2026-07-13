-- ============================================================================
-- NexaWork Meeting Service — V3__drop_call_scheduled_at.sql
-- Retrait de calls.scheduled_at : vestige de la planification de réunion (jamais
-- utilisée — une réunion est lancée en direct). Aligné avec le retrait de
-- CallStatus.SCHEDULED/CANCELLED (V2).
-- ============================================================================

ALTER TABLE calls DROP COLUMN IF EXISTS scheduled_at;
