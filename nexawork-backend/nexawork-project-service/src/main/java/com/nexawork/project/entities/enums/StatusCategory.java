package com.nexawork.project.entities.enums;

/**
 * Catégorie fixe d'un statut Kanban (V5.1 §6.2, §4.2) : Not started / Active /
 * Done / Closed. Sert à dériver {@code isInitial} (NOT_STARTED) et
 * {@code isFinal} (DONE/CLOSED).
 */
public enum StatusCategory {
    NOT_STARTED,
    ACTIVE,
    DONE,
    CLOSED
}
