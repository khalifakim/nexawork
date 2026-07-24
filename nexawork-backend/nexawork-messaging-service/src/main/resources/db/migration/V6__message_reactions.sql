-- Réactions emoji sur un message (canal ou conversation). Un utilisateur ne peut
-- poser qu'une fois un emoji donné sur un message (contrainte d'unicité) ; il peut
-- en poser plusieurs différents. Suppression en cascade avec le message.
CREATE TABLE message_reactions (
    id         UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
    user_id    UUID NOT NULL,
    emoji      VARCHAR(16) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uk_reaction_once UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_reactions_message ON message_reactions (message_id);
