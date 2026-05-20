package com.nexawork.project.events.publishers;

public record TaskAssignedEvent(
    Long taskId,
    String taskTitle,
    Long projectId,
    String projectName,
    Long assigneeUserId,
    Long assignerUserId
) {}
