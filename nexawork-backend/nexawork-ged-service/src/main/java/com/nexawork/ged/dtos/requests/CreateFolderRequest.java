package com.nexawork.ged.dtos.requests;

import jakarta.validation.constraints.NotBlank;

public record CreateFolderRequest(
    @NotBlank String name,
    Long parentId,
    Long projectId
) {}
