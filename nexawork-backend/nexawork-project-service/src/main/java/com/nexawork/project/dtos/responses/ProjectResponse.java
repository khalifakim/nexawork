package com.nexawork.project.dtos.responses;

import com.nexawork.project.entities.enums.ProjectStatus;

import java.time.LocalDateTime;

public record ProjectResponse(
    Long id,
    String name,
    String description,
    Long organisationId,
    Long ownerUserId,
    ProjectStatus status,
    LocalDateTime createdDate
) {}
