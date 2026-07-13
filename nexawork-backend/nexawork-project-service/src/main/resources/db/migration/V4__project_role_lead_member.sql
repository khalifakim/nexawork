-- ============================================================================
-- NexaWork Project Service — V4__project_role_lead_member.sql
-- Alignement du rôle projet sur le modèle binaire réellement appliqué
-- (chef de projet / membre) — V5.1 §6.2.
--   L'ancien triplet MANAGER / DEVELOPER / VIEWER n'était pas exploité par les
--   règles d'accès (fondées sur Project.owner_user_id) ; il est remplacé par
--   PROJECT_LEAD / PROJECT_MEMBER. Une granularité plus fine reste en perspective.
-- ============================================================================

-- Conversion des valeurs existantes (colonne stockée en chaîne).
UPDATE project_members
   SET project_role = CASE
        WHEN project_role = 'MANAGER' THEN 'PROJECT_LEAD'
        ELSE 'PROJECT_MEMBER'   -- DEVELOPER, VIEWER et toute autre valeur
   END;

-- Nouveau défaut aligné sur le membre simple.
ALTER TABLE project_members ALTER COLUMN project_role SET DEFAULT 'PROJECT_MEMBER';
