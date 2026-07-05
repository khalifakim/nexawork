package com.nexawork.notification.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Désinscription d'un abonnement Web Push (§13.7) par son endpoint.
 */
@Data
public class UnregisterPushRequest {

    @NotBlank(message = "est obligatoire")
    private String endpoint;
}
