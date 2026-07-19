-- V5 — Un projet peut exister sans chef de projet.
--
-- Décision fonctionnelle : l'administrateur qui crée un projet n'en devient ni membre
-- ni chef ; le chef est désigné explicitement ensuite (CU-CP05, V5.1 §4.2). Le code
-- écrit donc `ownerUserId = null` à la création — mais la colonne était restée NOT NULL
-- (V1__init.sql), ce qui faisait échouer TOUTE création de projet :
--   ERROR: null value in column "owner_user_id" of relation "projects" violates not-null constraint
--
-- owner_user_id devient donc nullable : NULL = « aucun chef de projet désigné ».
ALTER TABLE projects ALTER COLUMN owner_user_id DROP NOT NULL;
