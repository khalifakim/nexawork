package com.nexawork.messaging.services;

import com.nexawork.messaging.dtos.responses.MessageResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Diffusion temps réel des messages via WebSocket STOMP (V5.1 §7.5). Après
 * persistance (REST ou STOMP), le message est poussé aux abonnés du topic du
 * canal ou de la conversation.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MessageBroadcaster {

    SimpMessagingTemplate messagingTemplate;

    /** Diffuse un message de canal sur {@code /topic/channels/{channelId}}. */
    public void broadcastChannelMessage(UUID channelId, MessageResponse message) {
        messagingTemplate.convertAndSend("/topic/channels/" + channelId, message);
        log.debug("Message {} diffusé sur /topic/channels/{}", message.getId(), channelId);
    }

    /** Diffuse un message de conversation sur {@code /topic/conversations/{conversationId}}. */
    public void broadcastConversationMessage(UUID conversationId, MessageResponse message) {
        messagingTemplate.convertAndSend("/topic/conversations/" + conversationId, message);
        log.debug("Message {} diffusé sur /topic/conversations/{}", message.getId(), conversationId);
    }
}
