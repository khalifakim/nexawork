package com.nexawork.messaging.controllers;

import com.nexawork.messaging.dtos.requests.SendMessageRequest;
import com.nexawork.messaging.security.StompIdentity;
import com.nexawork.messaging.security.WebSocketHandshakeInterceptor;
import com.nexawork.messaging.services.ConversationService;
import com.nexawork.messaging.services.MessageService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;

import java.util.UUID;

/**
 * Destinations entrantes STOMP (V5.1 §7.5) : envoi de message via WebSocket.
 * {@code /app/channels/{id}/send} et {@code /app/conversations/{id}/send}. Le
 * message persisté est diffusé aux abonnés du topic par le service (broadcaster).
 *
 * <p>L'identité est reconstituée depuis les attributs de session STOMP (posés au
 * handshake par {@link WebSocketHandshakeInterceptor}) et placée dans le
 * SecurityContext le temps du traitement, afin que le {@code CallerContext} des
 * services fonctionne comme sur le chemin REST.</p>
 */
@Controller
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StompMessageController {

    MessageService messageService;
    ConversationService conversationService;

    @MessageMapping("/channels/{channelId}/send")
    public void sendToChannel(@DestinationVariable UUID channelId,
                              @Payload SendMessageRequest request,
                              SimpMessageHeaderAccessor accessor) {
        withIdentity(accessor, () -> messageService.sendChannelMessage(channelId, request));
    }

    @MessageMapping("/conversations/{conversationId}/send")
    public void sendToConversation(@DestinationVariable UUID conversationId,
                                   @Payload SendMessageRequest request,
                                   SimpMessageHeaderAccessor accessor) {
        withIdentity(accessor, () -> conversationService.sendMessage(conversationId, request));
    }

    /**
     * Exécute une action avec l'identité STOMP dans le SecurityContext, sous forme
     * de {@link io.jsonwebtoken.Claims} (comme le filtre HTTP), puis nettoie.
     */
    private void withIdentity(SimpMessageHeaderAccessor accessor, Runnable action) {
        Object userId = accessor.getSessionAttributes() != null
                ? accessor.getSessionAttributes().get(WebSocketHandshakeInterceptor.ATTR_USER_ID) : null;
        Object orgId = accessor.getSessionAttributes() != null
                ? accessor.getSessionAttributes().get(WebSocketHandshakeInterceptor.ATTR_ORG_ID) : null;
        Object orgRole = accessor.getSessionAttributes() != null
                ? accessor.getSessionAttributes().get(WebSocketHandshakeInterceptor.ATTR_ORG_ROLE) : null;

        SecurityContext previous = SecurityContextHolder.getContext();
        try {
            StompIdentity.apply(userId, orgId, orgRole);
            action.run();
        } finally {
            SecurityContextHolder.setContext(previous);
        }
    }
}
