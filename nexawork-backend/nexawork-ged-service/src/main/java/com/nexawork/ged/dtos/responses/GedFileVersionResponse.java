package com.nexawork.ged.dtos.responses;

import java.time.LocalDateTime;

public record GedFileVersionResponse(
    Long id,
    Long gedFileId,
    Integer versionNumber,
    Long sourceFileId,
    String fileUrl,
    Long fileSize,
    Long uploadedBy,
    LocalDateTime createdAt
) {}
