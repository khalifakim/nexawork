-- ============================================================================
-- NexaWork GED Service — V3__shared_links.sql
-- Brique 4 : liens de partage EXTERNES (accessibles sans compte).
--
-- Un lien ouvre l'accès à UN élément (fichier ou dossier) via un token opaque,
-- sans authentification NexaWork. La sécurité repose entièrement sur :
--   * le token opaque (imprévisible) ;
--   * une expiration optionnelle par DATE et/ou par NOMBRE d'accès ;
--   * un mot de passe optionnel (haché BCrypt) ;
--   * la révocation à tout moment ;
--   * une portée limitée au seul élément ciblé.
--
-- Deux modes :
--   * READ  — consultation + téléchargement (fichier, ou fichiers d'un dossier) ;
--   * DROP  — boîte de dépôt : un externe DÉPOSE des fichiers dans le dossier
--             ciblé, SANS voir son contenu existant (isolation). DROP => FOLDER.
-- ============================================================================

CREATE TABLE ged_shared_links (
    id                  UUID PRIMARY KEY,
    -- Token opaque URL-safe (Base64 sans padding de 32 octets aléatoires).
    token               VARCHAR(64)  NOT NULL UNIQUE,
    -- Workspace propriétaire de l'élément (borne le relais d'octets côté File Service).
    organisation_id     UUID         NOT NULL,
    target_type         VARCHAR(10)  NOT NULL,   -- FILE | FOLDER
    target_id           UUID         NOT NULL,
    mode                VARCHAR(10)  NOT NULL,    -- READ | DROP
    -- Mot de passe optionnel (haché BCrypt ; NULL = pas de mot de passe).
    password_hash       VARCHAR(100),
    -- Expiration par date (NULL = pas de limite de date).
    expires_at          TIMESTAMP,
    -- Expiration par nombre d'accès (NULL = illimité ; 1 = usage unique).
    max_access          INTEGER,
    access_count        INTEGER      NOT NULL DEFAULT 0,
    -- Garde-fous d'upload (mode DROP) : taille max et extensions autorisées (CSV).
    max_upload_bytes    BIGINT,
    allowed_extensions  VARCHAR(255),
    created_by_user_id  UUID         NOT NULL,
    revoked             BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_links_token   ON ged_shared_links (token);
CREATE INDEX idx_shared_links_creator ON ged_shared_links (created_by_user_id, organisation_id);

-- Paternité d'un dépôt externe : l'externe n'a pas de compte NexaWork, on ne lui
-- invente donc pas d'UUID. Son identité déclarée (nom / email) est conservée à
-- part sur le fichier déposé — added_by_user_id reste le créateur du lien.
ALTER TABLE ged_files ADD COLUMN external_uploader_name  VARCHAR(120);
ALTER TABLE ged_files ADD COLUMN external_uploader_email VARCHAR(180);
