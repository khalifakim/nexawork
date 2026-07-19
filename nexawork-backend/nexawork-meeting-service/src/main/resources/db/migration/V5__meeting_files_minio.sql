-- M5 (suite) — Le binaire des fichiers de réunion revient dans MinIO.
--
-- V4 avait rendu `file_id` nullable en supposant que le partage passerait par JaaS
-- (8x8 hébergeant le binaire, NexaWork n'en recevant que des métadonnées).
-- Décision du 2026-07-14 : NexaWork assure son PROPRE partage de fichiers dans la
-- salle → le binaire transite par le File Service et atterrit dans MinIO
-- (bucket `nexawork-documents`, contexte `meeting-file`). Le modèle d'origine
-- (`file_id` → StoredFile) redevient donc le bon.
--
-- `file_id` reste NULLABLE au niveau SQL : les lignes éventuellement créées via
-- JaaS (métadonnées seules) n'en ont pas, et une contrainte NOT NULL les rendrait
-- impossibles à conserver. L'application, elle, exige désormais un `fileId`.

-- URL de téléchargement stable servie par le File Service.
ALTER TABLE meeting_files
    ADD COLUMN IF NOT EXISTS download_url VARCHAR(1024);

-- Type MIME — utile à l'affichage (icône) et au téléchargement.
ALTER TABLE meeting_files
    ADD COLUMN IF NOT EXISTS content_type VARCHAR(255);

-- `jaas_file_id` devient inutile (plus de partage JaaS) mais n'est PAS supprimée :
-- une colonne larguée détruirait les lignes déjà captées. Elle reste nulle.
