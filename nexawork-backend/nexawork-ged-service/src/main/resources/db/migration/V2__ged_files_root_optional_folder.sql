-- ============================================================================
-- NexaWork GED Service — V2__ged_files_root_optional_folder.sql
-- Un fichier peut désormais vivre À LA RACINE de l'espace documentaire, sans
-- dossier (V5.1 §4.4 révisé). Deux changements :
--   1. ged_files porte son propre organisation_id (le scope org passait par le
--      dossier ; sans dossier, il faut le porter directement). Backfill depuis
--      le dossier existant.
--   2. folder_id devient nullable (null = fichier à la racine). Le scope racine
--      est alors (organisation_id, project_id) : project_id NULL = racine de
--      l'espace Organisation, sinon racine de l'espace du projet.
-- ============================================================================

-- 1. organisation_id (backfill depuis le dossier, puis NOT NULL)
ALTER TABLE ged_files ADD COLUMN organisation_id UUID;
UPDATE ged_files f
   SET organisation_id = d.organisation_id
  FROM ged_folders d
 WHERE f.folder_id = d.id;
ALTER TABLE ged_files ALTER COLUMN organisation_id SET NOT NULL;
CREATE INDEX idx_ged_files_org ON ged_files (organisation_id);

-- 2. folder_id nullable (la FK ON DELETE CASCADE reste valable pour les non-null)
ALTER TABLE ged_files ALTER COLUMN folder_id DROP NOT NULL;

-- Index de listing du contenu racine (fichiers sans dossier, par espace)
CREATE INDEX idx_ged_files_root
    ON ged_files (organisation_id, project_id)
    WHERE folder_id IS NULL AND is_deleted = FALSE;
