package com.nexawork.meeting.dtos.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Invitation d'un participant externe à un appel (§13.6). Génère un token à usage
 * unique et publie {@code external.guest.invited}.
 */
@Data
public class InviteGuestRequest {

    @NotBlank(message = "est obligatoire")
    @Email(message = "doit être une adresse email valide")
    private String email;

    @NotBlank(message = "est obligatoire")
    private String displayName;
}
