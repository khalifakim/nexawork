package com.nexawork.auth.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * POST /invitations/{token}/accept (§3.2) : création de compte + adhésion au
 * workspace avec le rôle imposé par l'invitant. L'email de connexion est celui
 * saisi dans le formulaire (peut différer de l'email d'invitation).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcceptInvitationRequest {

    @NotBlank
    @Size(max = 120)
    private String firstName;

    @NotBlank
    @Size(max = 120)
    private String lastName;

    @NotBlank
    @jakarta.validation.constraints.Email
    private String email;

    @NotBlank
    @Size(min = 8, max = 100)
    private String password;

    private String jobTitle;
}
