-- État de lecture d'un canal par utilisateur (parité non-lus avec les conversations).
CREATE TABLE channel_reads (
    id           UUID PRIMARY KEY,
    channel_id   UUID NOT NULL,
    user_id      UUID NOT NULL,
    last_read_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_channel_reads_channel_user UNIQUE (channel_id, user_id)
);

CREATE INDEX idx_channel_reads_user ON channel_reads (user_id);
