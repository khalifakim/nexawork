package com.nexawork.messaging.entities.enums;

/**
 * Type de mention extraite du contenu (V5.1 §6.4). Ordre de parsing obligatoire
 * (du motif le plus long au plus court) : {@code @@@} DOCUMENT → {@code @@} TASK →
 * {@code @} USER → {@code #} CHANNEL.
 */
public enum MentionType {
    USER,
    TASK,
    DOCUMENT,
    CHANNEL
}
