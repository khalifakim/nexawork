package com.nexawork.project.events.publishers;

public record LivrableValidatedEvent(
    Long taskId,
    String taskTitle,
    Long projectId,
    String projectName,
    Long validatedByUserId,
    Long assigneeUserId
) {}
