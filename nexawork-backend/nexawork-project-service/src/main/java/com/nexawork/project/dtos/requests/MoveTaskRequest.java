package com.nexawork.project.dtos.requests;

import jakarta.validation.constraints.NotNull;

public record MoveTaskRequest(
    @NotNull Long targetStatusId
) {}
