package com.nexawork.messaging.events.consumers;

import java.util.UUID;

/**
 * Payload de {@code project.deleted} (V5.1 §7.2), tel que publié par le Project
 * Service. Consommé pour supprimer les canaux d'un projet disparu (ils vivent dans
 * la base du Messaging, hors de portée de la cascade SQL du Project Service).
 */
public record ProjectDeletedEvent(
        UUID projectId,
        UUID organisationId) {
}
