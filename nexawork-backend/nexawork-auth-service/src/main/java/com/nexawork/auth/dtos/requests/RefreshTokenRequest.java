package com.nexawork.auth.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Rotation du refresh token (§13.1). `workspaceId` optionnel : fournit ou
 * change le contexte de workspace actif (mécanisme serveur du switch —
 * précision impl. Phase 2 documentée dans V5.1 §13.1).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshTokenRequest {

    @NotBlank
    private String refreshToken;

    private UUID workspaceId;
}
