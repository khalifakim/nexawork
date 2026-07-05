package com.nexawork.notification.controllers;

import com.nexawork.notification.services.PresenceService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

/**
 * Heartbeat de présence côté WebSocket (V5.1 §3.9) : le client envoie
 * périodiquement (≈ toutes les 20 s) vers {@code /app/presence/heartbeat} pour
 * réarmer le TTL de sa clé de présence Redis.
 */
@Controller
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StompPresenceController {

    PresenceService presenceService;

    @MessageMapping("/presence/heartbeat")
    public void heartbeat(Principal principal) {
        if (principal == null) {
            return;
        }
        try {
            presenceService.heartbeat(UUID.fromString(principal.getName()));
        } catch (IllegalArgumentException ignored) {
            // principal non-UUID : ignoré
        }
    }
}
