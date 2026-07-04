package com.nexawork.project.events.publishers;

import java.util.UUID;

/**
 * Payload de l'événement `project.created` (V5.1 §7.2) — consommé par le GED
 * (crée le dossier racine + le dossier système TASK_ATTACHMENTS) et le Messaging
 * (crée les canaux #général et #annonces par défaut).
 */
public record ProjectCreatedEvent(
        UUID projectId,
        String projectName,
        UUID organisationId,
        UUID ownerUserId) {
}
