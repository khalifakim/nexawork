package com.nexawork.auth.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateOrganisationRequest(
    @NotBlank @Size(min = 2, max = 100) String name
) {}
