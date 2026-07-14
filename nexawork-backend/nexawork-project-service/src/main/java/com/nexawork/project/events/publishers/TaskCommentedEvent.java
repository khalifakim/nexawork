package com.nexawork.project.events.publishers;

import java.util.List;
import java.util.UUID;

/**
 * Payload de l'événement {@code task.commented} (V5.1 §7.2) — consommé par le
 * Notification Service. Émis à chaque nouveau commentaire de tâche : tous les
 * membres du projet (hors auteur) sont notifiés.
 */
public record TaskCommentedEvent(
        UUID taskId,
        String taskKey,
        String taskTitle,
        UUID projectId,
        String projectName,
        /** Workspace propriétaire — porté jusqu'à la notification pour la scoper. */
        UUID organisationId,
        UUID authorUserId,
        String excerpt,
        /** Destinataires : membres du projet, hors auteur. */
        List<UUID> recipientUserIds) {
}
