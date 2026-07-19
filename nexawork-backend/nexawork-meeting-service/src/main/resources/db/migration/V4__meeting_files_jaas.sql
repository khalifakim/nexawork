-- M5 — Fichiers partagés en réunion.
--
-- La table `meeting_files` de V1 supposait que le binaire transite par le File
-- Service de NexaWork (`file_id` → MinIO). Ce n'est PAS ce que fait JaaS : le
-- fichier est téléversé dans la salle et hébergé par 8x8 ; NexaWork n'en reçoit
-- que les métadonnées (événement `fileUploaded` de l'IFrame API). On ne peut donc
-- pas renseigner `file_id`, et on n'invente pas un identifiant qui ne pointerait
-- sur rien.
--
-- On garde donc la trace de ce qui a été partagé (visible dans l'historique de la
-- réunion), sans prétendre détenir le fichier.

ALTER TABLE meeting_files
    ALTER COLUMN file_id DROP NOT NULL;

-- Identifiant du fichier CHEZ JaaS (l'événement `fileUploaded` le fournit).
ALTER TABLE meeting_files
    ADD COLUMN IF NOT EXISTS jaas_file_id VARCHAR(255);

ALTER TABLE meeting_files
    ADD COLUMN IF NOT EXISTS file_name VARCHAR(512);

ALTER TABLE meeting_files
    ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Nom affiché de celui qui a partagé : un invité EXTERNE n'a pas de compte, donc
-- pas d'UUID exploitable (`shared_by` reste nul dans ce cas).
ALTER TABLE meeting_files
    ALTER COLUMN shared_by DROP NOT NULL;

ALTER TABLE meeting_files
    ADD COLUMN IF NOT EXISTS shared_by_name VARCHAR(255);
