package com.nexawork.project.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Commentaire de tâche (§13.2).
 */
@Data
@Builder
public class CommentResponse {

    private UUID id;
    private UUID taskId;
    private UUID authorUserId;
    private String content;
    private LocalDateTime createdAt;
}
