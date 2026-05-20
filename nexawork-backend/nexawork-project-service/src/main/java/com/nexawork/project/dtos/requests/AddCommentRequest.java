package com.nexawork.project.dtos.requests;

import jakarta.validation.constraints.NotBlank;

public record AddCommentRequest(
    @NotBlank String content
) {}
