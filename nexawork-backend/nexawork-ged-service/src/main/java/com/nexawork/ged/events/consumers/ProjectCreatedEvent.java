package com.nexawork.ged.events.consumers;

import java.util.UUID;

/**
 * Payload de l'événement {@code project.created} (V5.1 §7.2), tel que publié par
 * le Project Service. Consommé pour créer le dossier racine et le dossier système
 * TASK_ATTACHMENTS du projet.
 */
public record ProjectCreatedEvent(
        UUID projectId,
        String projectName,
        UUID organisationId,
        UUID ownerUserId) {
}
