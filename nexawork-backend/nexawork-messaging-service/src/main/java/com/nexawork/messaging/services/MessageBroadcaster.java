package com.nexawork.messaging.services;

import com.nexawork.messaging.dtos.responses.ChannelActivityEvent;
import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.dtos.responses.TypingEvent;
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

    /**
     * Signale l'activité d'un canal à ceux qui ne l'ont PAS ouvert (cloche du
     * frontend). Le routage respecte REF F — sans quoi l'extrait d'un message de
     * canal privé fuiterait vers tout le workspace :
     * <ul>
     *   <li><b>canal privé</b> → file personnelle de chaque membre du canal ;</li>
     *   <li><b>canal public</b> → topic du workspace (visible de tous ses membres).</li>
     * </ul>
     * L'auteur est exclu côté client (il sait ce qu'il vient d'écrire).
     */
    public void broadcastChannelActivity(UUID organisationId, boolean isPrivate,
                                         java.util.List<UUID> channelMemberIds,
                                         ChannelActivityEvent event) {
        if (isPrivate) {
            for (UUID userId : channelMemberIds) {
                messagingTemplate.convertAndSendToUser(userId.toString(), "/queue/channel-activity", event);
            }
            return;
        }
        messagingTemplate.convertAndSend("/topic/org/" + organisationId + "/channel-activity", event);
    }

    /** Diffuse un message de conversation sur {@code /topic/conversations/{conversationId}}. */
    public void broadcastConversationMessage(UUID conversationId, MessageResponse message) {
        messagingTemplate.convertAndSend("/topic/conversations/" + conversationId, message);
        log.debug("Message {} diffusé sur /topic/conversations/{}", message.getId(), conversationId);
    }

    /**
     * Diffuse l'indicateur de saisie sur {@code /topic/conversations/{id}/typing}
     * (événement volatile, jamais persisté).
     */
    public void broadcastTyping(UUID conversationId, TypingEvent event) {
        messagingTemplate.convertAndSend("/topic/conversations/" + conversationId + "/typing", event);
    }

    /**
     * Diffuse l'indicateur de saisie d'un canal sur {@code /topic/channels/{id}/typing}
     * (événement volatile, jamais persisté). Les abonnés — vue du canal ET sidebar —
     * affichent « En train d'écrire… » pour ceux qui ne sont pas l'auteur.
     */
    public void broadcastChannelTyping(UUID channelId, TypingEvent event) {
        messagingTemplate.convertAndSend("/topic/channels/" + channelId + "/typing", event);
    }
}
