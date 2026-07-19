package com.nexawork.project.events.publishers;

import java.util.UUID;

/**
 * {@code comment.mention} — un utilisateur a été mentionné dans le commentaire
 * d'une tâche (§4.7). Consommé par le Notification Service : la personne visée est
 * notifiée, avec un lien ouvrant la fiche de tâche ancrée sur le commentaire.
 */
public record CommentMentionEvent(
        UUID commentId,
        UUID taskId,
        String taskKey,
        String taskTitle,
        UUID projectId,
        String projectName,
        UUID recipientUserId,
        UUID authorUserId,
        UUID organisationId,
        String excerpt) {
}
