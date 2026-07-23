-- ============================================================================
-- NexaWork Project Service — V3__task_status_mandatory.sql
-- Le statut Kanban d'une tâche devient OBLIGATOIRE : une tâche est toujours
-- positionnée dans une colonne (statut initial « À faire » par défaut).
--   1. Backfill des tâches sans statut → statut initial de leur projet
--      (sinon 1re colonne par position).
--   2. Remplacement de la FK « ON DELETE SET NULL » par « ON DELETE RESTRICT » :
--      on ne peut plus vider le statut d'une tâche en supprimant la colonne ;
--      la suppression d'une colonne non vide est refusée côté service (409).
--   3. status_id passe NOT NULL (après backfill : plus aucune valeur nulle).
-- ============================================================================

-- ─── 1. Backfill : tâches sans statut → statut initial (sinon 1re colonne) ────
UPDATE tasks t
   SET status_id = COALESCE(
       (SELECT s.id FROM workflow_statuses s
         WHERE s.project_id = t.project_id AND s.is_initial = TRUE
         ORDER BY s.position ASC
         LIMIT 1),
       (SELECT s.id FROM workflow_statuses s
         WHERE s.project_id = t.project_id
         ORDER BY s.position ASC
         LIMIT 1))
 WHERE t.status_id IS NULL;

-- ─── 2. FK : SET NULL → RESTRICT ─────────────────────────────────────────────
ALTER TABLE tasks DROP CONSTRAINT fk_tasks_status;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_status FOREIGN KEY (status_id)
    REFERENCES workflow_statuses (id) ON DELETE RESTRICT;

-- ─── 3. Contrainte définitive ────────────────────────────────────────────────
ALTER TABLE tasks ALTER COLUMN status_id SET NOT NULL;
