package com.nexawork.project.events.publishers;

public record FileAttachedToTaskEvent(
    Long taskId,
    String taskTitle,
    Long projectId,
    String fileName,
    String fileUrl,
    Long uploadedByUserId
) {}
