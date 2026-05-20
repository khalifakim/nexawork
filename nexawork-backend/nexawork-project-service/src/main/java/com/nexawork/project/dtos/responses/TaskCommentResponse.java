package com.nexawork.project.dtos.responses;

import java.time.LocalDateTime;

public record TaskCommentResponse(
    Long id,
    Long taskId,
    Long authorUserId,
    String content,
    LocalDateTime createdAt
) {}
