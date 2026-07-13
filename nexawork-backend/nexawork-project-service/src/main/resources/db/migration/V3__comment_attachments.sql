-- ============================================================================
-- NexaWork Project Service — V3__comment_attachments.sql
-- Pièces jointes d'un commentaire de tâche (V5.1 §4.2 / §13.2).
--   Le composeur de commentaire de la fiche de tâche permet de joindre des
--   fichiers ; ils sont d'abord poussés au File Service (bucket task-attachment)
--   puis référencés ici par leur URL de téléchargement stable.
-- Composition : cascade avec le commentaire parent (ON DELETE CASCADE).
-- ============================================================================

CREATE TABLE comment_attachments (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id              UUID            NOT NULL,
    file_name               VARCHAR(255)    NOT NULL,
    file_url                VARCHAR(1024)   NOT NULL,
    file_size               BIGINT,
    content_type            VARCHAR(255),
    created_at              TIMESTAMP       NOT NULL DEFAULT now(),
    CONSTRAINT fk_comment_attachments_comment FOREIGN KEY (comment_id)
        REFERENCES task_comments (id) ON DELETE CASCADE
);
CREATE INDEX idx_comment_attachments_comment ON comment_attachments (comment_id);
