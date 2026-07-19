-- M5 (nettoyage) — Retrait de `jaas_file_id`.
--
-- Cette colonne (ajoutée en V4) était le vestige de la tentative de s'appuyer sur
-- le partage natif de JaaS (fichier hébergé chez 8x8, métadonnées seules). Depuis
-- V5, NexaWork assure son propre partage via MinIO : `jaas_file_id` n'a plus jamais
-- été renseigné ni lu. Colonne morte → supprimée.
--
-- On ne modifie PAS V4/V5 (déjà appliquées) : on ajoute cette migration.

ALTER TABLE meeting_files
    DROP COLUMN IF EXISTS jaas_file_id;
