package com.nexawork.ged.entities.enums;

/**
 * Type de dossier GED (V5.1 §4.4, §6.3). {@code USER} = dossier classique,
 * librement administré. {@code TASK_ATTACHMENTS} = dossier système « Pièces
 * jointes aux tâches » à contenu virtuel (jamais stocké en base GED).
 */
public enum FolderType {
    USER,
    TASK_ATTACHMENTS
}
