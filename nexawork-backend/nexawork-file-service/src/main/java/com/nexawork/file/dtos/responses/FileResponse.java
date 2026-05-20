package com.nexawork.file.dtos.responses;

import java.time.LocalDateTime;

public record FileResponse(
    Long id,
    String originalName,
    String contentType,
    Long size,
    String downloadUrl,
    Long uploadedByUserId,
    Long projectId,
    Long taskId,
    LocalDateTime uploadedAt
) {}
