package com.nexawork.notification.events;

import com.nexawork.notification.services.PresenceService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.UUID;

/**
 * Traduit les événements de session WebSocket STOMP en présence Redis (§7.5) :
 * une connexion marque l'utilisateur en ligne, une déconnexion le retire. Le
 * Principal de session (posé au handshake = userId) identifie l'utilisateur.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WebSocketPresenceListener {

    PresenceService presenceService;
    SimpMessagingTemplate messagingTemplate;

    /** Changement de présence diffusé à tous : chacun voit l'autre passer en ligne / hors ligne. */
    public record PresenceEvent(UUID userId, boolean online) {
    }

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        userIdOf(event.getUser()).ifPresent(id -> {
            presenceService.markOnline(id);
            broadcast(id, true);
            log.debug("WS connect : {} en ligne", id);
        });
    }

    /**
     * Sans cette diffusion, les autres clients n'apprenaient le changement qu'au
     * prochain sondage (jusqu'à 20 s) — ou au rechargement de la page.
     */
    private void broadcast(UUID userId, boolean online) {
        messagingTemplate.convertAndSend("/topic/presence", new PresenceEvent(userId, online));
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = accessor.getUser();
        userIdOf(user).ifPresent(id -> {
            presenceService.markOffline(id);
            broadcast(id, false);
            log.debug("WS disconnect : {}", id);
        });
    }

    private java.util.Optional<UUID> userIdOf(Principal principal) {
        if (principal == null) {
            return java.util.Optional.empty();
        }
        try {
            return java.util.Optional.of(UUID.fromString(principal.getName()));
        } catch (Exception e) {
            return java.util.Optional.empty();
        }
    }
}
