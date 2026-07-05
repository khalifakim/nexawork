package com.nexawork.meeting.events.publishers;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * Publie les événements du Meeting Service sur l'exchange {@code nexawork.events}
 * (§7.1) : {@code call.ended} (Lot 9A) et {@code external.guest.invited} (Lot 9B).
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MeetingEventPublisher {

    public static final String EXCHANGE = "nexawork.events";
    public static final String ROUTING_CALL_ENDED = "call.ended";
    public static final String ROUTING_GUEST_INVITED = "external.guest.invited";

    RabbitTemplate rabbitTemplate;

    public void publishCallEnded(CallEndedEvent event) {
        publish(ROUTING_CALL_ENDED, event, "appel " + event.callId());
    }

    public void publish(String routingKey, Object event, String context) {
        try {
            rabbitTemplate.convertAndSend(EXCHANGE, routingKey, event);
            log.info("Event {} publié ({})", routingKey, context);
        } catch (Exception e) {
            log.error("Échec publication {} ({}) : {}", routingKey, context, e.getMessage());
        }
    }
}
