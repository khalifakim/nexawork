package com.nexawork.auth.dtos.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * POST /users/me/email (§13.1) — demande de changement d'email avec
 * vérification par lien envoyé à la nouvelle adresse.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangeEmailRequest {

    @NotBlank
    @Email
    private String newEmail;
}
