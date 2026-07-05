package com.nexawork.project.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Sous-tâche (§13.2).
 */
@Data
@Builder
public class SubTaskResponse {

    private UUID id;
    private UUID taskId;
    private String title;
    private Boolean isCompleted;
    private UUID assigneeUserId;
    private UUID createdBy;
    private LocalDateTime createdAt;
}
