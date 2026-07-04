package com.nexawork.auth.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * POST /workspaces (§13.1, §3.3) : nom + couleur palette (10 couleurs
 * standard) + slug généré depuis le nom, modifiable. REF I côté service.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWorkspaceRequest {

    @NotBlank
    @Size(max = 255)
    private String name;

    /**
     * Identifiant URL-friendly — généré côté serveur depuis le nom si absent.
     */
    @Size(max = 255)
    @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$", message = "slug invalide (kebab-case attendu)")
    private String slug;

    @NotBlank
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "couleur hex attendue (ex. #6C70F0)")
    private String color;
}
