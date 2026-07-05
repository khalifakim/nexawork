package com.nexawork.project.events.publishers;

import java.util.UUID;

/**
 * Payload de l'événement `task.assigned` (V5.1 §7.2) — consommé par le
 * Notification Service (queue nexawork.notification.task-assigned). Émis
 * uniquement pour une assignation à un utilisateur (assigneeType = USER).
 */
public record TaskAssignedEvent(
        UUID taskId,
        String taskTitle,
        UUID projectId,
        String projectName,
        UUID assigneeUserId,
        UUID assignerUserId) {
}
