package com.nexawork.notification.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Enregistrement d'un abonnement Web Push (§13.7), tel que fourni par
 * {@code PushManager.subscribe()} côté navigateur : {@code { endpoint, keys: { p256dh, auth } }}.
 */
@Data
public class RegisterPushRequest {

    @NotBlank(message = "est obligatoire")
    private String endpoint;

    @NotNull(message = "est obligatoire")
    private Keys keys;

    @Data
    public static class Keys {
        @NotBlank(message = "est obligatoire")
        private String p256dh;
        @NotBlank(message = "est obligatoire")
        private String auth;
    }
}
