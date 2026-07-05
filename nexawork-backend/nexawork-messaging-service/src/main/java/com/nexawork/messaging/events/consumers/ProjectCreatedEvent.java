package com.nexawork.messaging.events.consumers;

import java.util.UUID;

/**
 * Payload de {@code project.created} (V5.1 §7.2), tel que publié par le Project
 * Service. Consommé pour créer les canaux par défaut du projet.
 */
public record ProjectCreatedEvent(
        UUID projectId,
        String projectName,
        UUID organisationId,
        UUID ownerUserId) {
}
