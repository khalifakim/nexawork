-- ============================================================================
-- NexaWork Project Service — V2__add_task_key.sql
-- Identifiant lisible de tâche (PREFIX-NNN, ex. MOB-101) attendu par le frontend.
--   projects.prefix          : préfixe court du projet, unique par workspace.
--   projects.task_sequence   : compteur auto-incrémenté (dernier numéro attribué).
--   tasks.task_key           : PREFIX + "-" + numéro, unique par projet.
-- Le prefix est dérivé du nom (initiales si multi-mots, sinon 3 premières lettres)
-- puis rendu unique par suffixe numérique ; task_key est généré à la création de
-- chaque tâche dans le TaskService. Cette migration backfill les données existantes.
-- ============================================================================

ALTER TABLE projects ADD COLUMN prefix         VARCHAR(10);
ALTER TABLE projects ADD COLUMN task_sequence  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks    ADD COLUMN task_key        VARCHAR(20);

-- ─── Backfill des projets et tâches existants ────────────────────────────────
DO $$
DECLARE
    p         RECORD;
    base      TEXT;
    candidate TEXT;
    suffix    INTEGER;
    t         RECORD;
    seq       INTEGER;
BEGIN
    FOR p IN SELECT id, name, organisation_id FROM projects
             ORDER BY created_date NULLS FIRST, id LOOP

        -- Prefix de base dérivé du nom.
        IF array_length(regexp_split_to_array(trim(p.name), '\s+'), 1) >= 2 THEN
            -- Initiales des mots (« Refonte Site Web » → « RSW »).
            SELECT string_agg(upper(left(w, 1)), '')
              INTO base
              FROM unnest(regexp_split_to_array(trim(p.name), '\s+')) AS w
             WHERE w <> '';
        ELSE
            -- 3 premières lettres.
            base := upper(left(regexp_replace(trim(p.name), '[^A-Za-z0-9]', '', 'g'), 3));
        END IF;
        base := regexp_replace(coalesce(base, ''), '[^A-Z0-9]', '', 'g');
        IF base = '' THEN base := 'PRJ'; END IF;
        base := left(base, 10);

        -- Unicité par workspace : suffixe numérique si déjà pris.
        candidate := base;
        suffix := 1;
        WHILE EXISTS (SELECT 1 FROM projects x
                      WHERE x.organisation_id = p.organisation_id
                        AND x.prefix = candidate) LOOP
            candidate := left(base, 8) || suffix::text;
            suffix := suffix + 1;
        END LOOP;

        UPDATE projects SET prefix = candidate WHERE id = p.id;

        -- Numérote les tâches existantes par ordre de création.
        seq := 0;
        FOR t IN SELECT id FROM tasks WHERE project_id = p.id
                 ORDER BY created_date NULLS FIRST, id LOOP
            seq := seq + 1;
            UPDATE tasks SET task_key = candidate || '-' || seq::text WHERE id = t.id;
        END LOOP;
        UPDATE projects SET task_sequence = seq WHERE id = p.id;
    END LOOP;
END $$;

-- ─── Contraintes définitives (après backfill : plus aucune valeur nulle) ──────
ALTER TABLE projects ALTER COLUMN prefix SET NOT NULL;
ALTER TABLE projects ADD CONSTRAINT uk_projects_org_prefix UNIQUE (organisation_id, prefix);

ALTER TABLE tasks ALTER COLUMN task_key SET NOT NULL;
ALTER TABLE tasks ADD CONSTRAINT uk_tasks_project_task_key UNIQUE (project_id, task_key);
CREATE INDEX idx_tasks_task_key ON tasks (task_key);
