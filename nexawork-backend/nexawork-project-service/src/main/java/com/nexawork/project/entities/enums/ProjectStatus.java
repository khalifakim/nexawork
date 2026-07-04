package com.nexawork.project.entities.enums;

/**
 * Cycle de vie d'un projet (V5.1 §6.2) : Actif ⇄ Archivé.
 * Il n'existe pas d'état « Terminé » — l'archivage est la seule transition,
 * réversible (voir §4.2).
 */
public enum ProjectStatus {
    ACTIVE,
    ARCHIVED
}
