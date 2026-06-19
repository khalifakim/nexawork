package com.nexawork.ged.dtos.requests;

import jakarta.validation.constraints.NotNull;

public record AddFileVersionRequest(
    @NotNull Long sourceFileId,
    @NotNull String fileUrl,
    Long fileSize
) {}
