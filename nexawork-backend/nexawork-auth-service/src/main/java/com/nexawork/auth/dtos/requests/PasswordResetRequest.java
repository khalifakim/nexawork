package com.nexawork.auth.dtos.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Demande de lien de réinitialisation (§3.4 étape 1). La réponse est toujours
 * 200 — silence si aucun compte (pas de divulgation d'existence).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetRequest {

    @NotBlank
    @Email
    private String email;
}
