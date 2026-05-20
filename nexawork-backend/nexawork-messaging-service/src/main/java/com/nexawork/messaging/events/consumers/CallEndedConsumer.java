package com.nexawork.messaging.events.consumers;

import com.nexawork.messaging.configurations.RabbitMQConfig;
import com.nexawork.messaging.dtos.requests.SendMessageRequest;
import com.nexawork.messaging.repositories.ChannelRepository;
import com.nexawork.messaging.services.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class CallEndedConsumer {

    private final ChannelRepository channelRepo;
    private final MessageService messageService;

    @RabbitListener(queues = RabbitMQConfig.Q_CALL_ENDED)
    public void onCallEnded(Map<String, Object> event) {
        try {
            Long projectId  = toLong(event.get("projectId"));
            Long hostUserId = toLong(event.get("hostUserId"));
            String topic    = (String) event.getOrDefault("topic", "Réunion");
            Integer duration = event.get("durationSeconds") instanceof Number n
                ? n.intValue() : 0;

            channelRepo.findByProjectId(projectId).stream().findFirst().ifPresent(channel -> {
                String msg = String.format("📹 Réunion \"%s\" terminée — Durée : %d min %d s",
                    topic, duration / 60, duration % 60);
                messageService.send(channel.getId(),
                    new SendMessageRequest(msg, null, null), hostUserId);
            });
        } catch (Exception e) {
            log.error("Erreur traitement call.ended : {}", e.getMessage());
        }
    }

    private Long toLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.longValue();
        return Long.parseLong(value.toString());
    }
}
