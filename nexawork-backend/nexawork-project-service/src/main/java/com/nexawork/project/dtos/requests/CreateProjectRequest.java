package com.nexawork.project.dtos.requests;

import jakarta.validation.constraints.NotBlank;

public record CreateProjectRequest(
    @NotBlank String name,
    String description
) {}
