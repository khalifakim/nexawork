-- Suppression de conversation PAR UTILISATEUR (soft-delete, façon WhatsApp).
-- `cleared_at` = instant où ce participant a supprimé la conversation de son côté :
-- ses messages antérieurs lui sont masqués et la conversation disparaît de sa liste
-- jusqu'à un nouveau message. L'autre participant continue de tout voir. La
-- suppression n'est définitive (lignes purgées) que lorsque les DEUX participants
-- ont un `cleared_at`.
ALTER TABLE conversation_participants ADD COLUMN cleared_at TIMESTAMP;
