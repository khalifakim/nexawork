package com.nexawork.auth.events.publishers;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * Publie `member.invited` sur l'exchange topic `nexawork.events` (V5.1 §7.1).
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MemberInvitedPublisher {

    public static final String EXCHANGE = "nexawork.events";
    public static final String ROUTING_KEY = "member.invited";

    RabbitTemplate rabbitTemplate;

    public void publish(MemberInvitedEvent event) {
        try {
            rabbitTemplate.convertAndSend(EXCHANGE, ROUTING_KEY, event);
            log.info("Event member.invited publié pour {} (workspace {})",
                    event.inviteeEmail(), event.organisationName());
        } catch (Exception e) {
            // La publication d'event ne doit pas faire échouer l'invitation elle-même
            log.error("Échec de publication member.invited pour {} : {}", event.inviteeEmail(), e.getMessage());
        }
    }
}
