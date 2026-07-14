package com.nexawork.project.events.publishers;

import java.util.UUID;

/**
 * Payload de l'événement `livrable.validated` (V5.1 §7.2) — consommé par le
 * Notification Service (queue nexawork.notification.livrable-validated). Émis
 * quand une tâche passe à un statut final (isFinal). {@code assigneeUserId} est
 * nul si la tâche n'était pas assignée à un utilisateur.
 */
public record LivrableValidatedEvent(
        UUID taskId,
        String taskTitle,
        UUID projectId,
        String projectName,
        /** Workspace propriétaire — porté jusqu'à la notification pour la scoper. */
        UUID organisationId,
        UUID validatedByUserId,
        UUID assigneeUserId) {
}
