package com.nexawork.ged.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record GrantAccessRequest(
    @NotBlank String targetType,   // "FOLDER" | "FILE"
    @NotNull  Long   targetId,
    @NotBlank String granteeType,  // "USER" | "TEAM"
    @NotNull  Long   granteeId,
    @NotBlank String accessLevel   // "READER" | "EDITOR"
) {}
