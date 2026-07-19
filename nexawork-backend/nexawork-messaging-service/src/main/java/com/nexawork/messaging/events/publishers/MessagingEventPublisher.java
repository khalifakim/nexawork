package com.nexawork.messaging.events.publishers;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * Publie les événements du Messaging Service sur l'exchange topic
 * {@code nexawork.events} (V5.1 §7.1) : {@code message.mention} — la personne
 * mentionnée doit être notifiée (§4.7).
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MessagingEventPublisher {

    public static final String EXCHANGE = "nexawork.events";
    public static final String ROUTING_MESSAGE_MENTION = "message.mention";
    public static final String ROUTING_MESSAGE_CREATED = "message.created";

    RabbitTemplate rabbitTemplate;

    public void publishMention(MessageMentionEvent event) {
        try {
            rabbitTemplate.convertAndSend(EXCHANGE, ROUTING_MESSAGE_MENTION, event);
            log.info("Événement {} publié : {} mentionné dans le message {}",
                    ROUTING_MESSAGE_MENTION, event.recipientUserId(), event.messageId());
        } catch (Exception e) {
            // Une notification manquée ne doit jamais faire échouer l'envoi du message.
            log.error("Échec de publication de {} : {}", ROUTING_MESSAGE_MENTION, e.getMessage());
        }
    }

    /** Nouveau message (§4.7) — notifie les destinataires concernés (DM / canal privé). */
    public void publishMessageCreated(MessageCreatedEvent event) {
        try {
            rabbitTemplate.convertAndSend(EXCHANGE, ROUTING_MESSAGE_CREATED, event);
            log.info("Événement {} publié : message {} → {} destinataire(s)",
                    ROUTING_MESSAGE_CREATED, event.messageId(),
                    event.recipientUserIds() != null ? event.recipientUserIds().size() : 0);
        } catch (Exception e) {
            log.error("Échec de publication de {} : {}", ROUTING_MESSAGE_CREATED, e.getMessage());
        }
    }
}
