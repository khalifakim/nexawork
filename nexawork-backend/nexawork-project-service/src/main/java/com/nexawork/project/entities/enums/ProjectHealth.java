package com.nexawork.project.entities.enums;

/**
 * État de santé calculé d'un projet (V5.1 §6.7) — non persisté, dérivé de
 * l'avancement, des retards et des jours restants. Distinct de
 * {@link ProjectStatus} (cycle de vie).
 */
public enum ProjectHealth {
    EN_BONNE_VOIE,
    A_SURVEILLER,
    CRITIQUE
}
