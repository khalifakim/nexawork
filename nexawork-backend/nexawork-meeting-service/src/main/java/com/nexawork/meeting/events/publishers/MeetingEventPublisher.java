package com.nexawork.meeting.events.publishers;

import com.nexawork.meeting.entities.Call;
import com.nexawork.meeting.entities.ExternalGuest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class MeetingEventPublisher {

    private static final String EXCHANGE = "nexawork.events";
    private final RabbitTemplate rabbitTemplate;

    public void publishCallEnded(Call call, long durationSeconds) {
        Map<String, Object> event = new HashMap<>();
        event.put("callId", call.getId());
        event.put("topic", call.getTopic());
        event.put("roomName", call.getRoomName());
        event.put("organisationId", call.getOrganisationId());
        event.put("projectId", call.getProjectId());
        event.put("hostUserId", call.getHostUserId());
        event.put("durationSeconds", durationSeconds);
        publish("call.ended", event);
    }

    public void publishExternalGuestInvited(Call call, ExternalGuest guest, Long inviterUserId) {
        Map<String, Object> event = new HashMap<>();
        event.put("callId", call.getId());
        event.put("topic", call.getTopic());
        event.put("guestEmail", guest.getEmail());
        event.put("guestDisplayName", guest.getDisplayName());
        event.put("guestToken", guest.getGuestToken());
        event.put("inviterUserId", inviterUserId);
        publish("external.guest.invited", event);
    }

    private void publish(String routingKey, Object event) {
        log.info("Publishing [{}]", routingKey);
        rabbitTemplate.convertAndSend(EXCHANGE, routingKey, event);
    }
}
