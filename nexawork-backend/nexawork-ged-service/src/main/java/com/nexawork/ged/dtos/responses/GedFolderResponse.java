package com.nexawork.ged.dtos.responses;

import java.time.LocalDateTime;

public record GedFolderResponse(
    Long id,
    String name,
    Long parentId,
    Long organisationId,
    Long projectId,
    Long createdByUserId,
    LocalDateTime createdAt
) {}
