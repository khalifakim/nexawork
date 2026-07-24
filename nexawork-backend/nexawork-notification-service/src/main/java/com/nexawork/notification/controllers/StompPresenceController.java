package com.nexawork.notification.controllers;

import com.nexawork.notification.events.WebSocketPresenceListener;
import com.nexawork.notification.services.PresenceService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

/**
 * Heartbeat de présence côté WebSocket (V5.1 §3.9) : le client envoie
 * périodiquement (≈ toutes les 20 s) vers {@code /app/presence/heartbeat} pour
 * réarmer le TTL de sa clé de présence Redis.
 *
 * <p>Le heartbeat GARANTIT aussi la présence : si la clé n'existe pas (session
 * échappée au {@code SessionConnectedEvent}), il (re)met l'utilisateur en ligne
 * et diffuse le changement. C'est le filet de sécurité contre une présence
 * asymétrique (un client voit l'autre, mais pas l'inverse).</p>
 */
@Controller
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StompPresenceController {

    PresenceService presenceService;
    SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/presence/heartbeat")
    public void heartbeat(Principal principal) {
        if (principal == null) {
            return;
        }
        try {
            UUID userId = UUID.fromString(principal.getName());
            // (Re)crée la présence si elle manque, et diffuse alors le passage en ligne.
            if (presenceService.ensureOnline(userId)) {
                messagingTemplate.convertAndSend("/topic/presence",
                        new WebSocketPresenceListener.PresenceEvent(userId, true));
            }
        } catch (IllegalArgumentException ignored) {
            // principal non-UUID : ignoré
        }
    }
}
