package com.nexawork.meeting.entities.enums;

/**
 * Cycle de vie d'un appel (V5.1 §6.5). Une réunion NexaWork est lancée en direct
 * (immédiatement {@code ACTIVE}) puis {@code ENDED} — il n'y a pas de planification
 * à l'avance. Les valeurs {@code SCHEDULED}/{@code CANCELLED} ont été retirées :
 * elles n'étaient jamais produites.
 */
public enum CallStatus {
    ACTIVE,
    ENDED
}
