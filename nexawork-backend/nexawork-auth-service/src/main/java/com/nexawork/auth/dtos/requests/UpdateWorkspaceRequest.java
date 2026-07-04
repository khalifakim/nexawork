package com.nexawork.auth.dtos.requests;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * PATCH /workspaces/{id} (§13.1) : renommage + couleur palette. Le slug est
 * verrouillé (V5.1 §4.1).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateWorkspaceRequest {

    @Size(max = 255)
    private String name;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "couleur hex attendue (ex. #6C70F0)")
    private String color;
}
