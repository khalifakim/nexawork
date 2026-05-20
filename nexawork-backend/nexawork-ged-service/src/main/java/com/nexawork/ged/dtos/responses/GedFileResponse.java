package com.nexawork.ged.dtos.responses;

import java.time.LocalDateTime;

public record GedFileResponse(
    Long id,
    Long folderId,
    String name,
    String fileUrl,
    Long fileSize,
    String contentType,
    Long taskId,
    Long projectId,
    Long addedByUserId,
    LocalDateTime addedAt
) {}
