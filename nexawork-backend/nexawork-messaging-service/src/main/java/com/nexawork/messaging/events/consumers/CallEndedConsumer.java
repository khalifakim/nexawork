package com.nexawork.messaging.events.consumers;

import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.entities.Channel;
import com.nexawork.messaging.entities.Message;
import com.nexawork.messaging.entities.enums.MessageType;
import com.nexawork.messaging.events.consumers.ProjectCreatedConsumer;
import com.nexawork.messaging.mappers.MessageMapper;
import com.nexawork.messaging.repositories.ChannelRepository;
import com.nexawork.messaging.repositories.MessageRepository;
import com.nexawork.messaging.services.MessageBroadcaster;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consomme {@code call.ended} (queue {@code nexawork.messaging.call-ended}, V5.1
 * §7.3) : poste un message système « Réunion … terminée — Durée : X min » dans le
 * canal « général » du projet, puis le diffuse en temps réel.
 *
 * <p>Si le projet n'a pas encore de canal « général » (event hors projet ou canal
 * supprimé), l'event est ignoré sans erreur.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CallEndedConsumer {

    ChannelRepository channelRepository;
    MessageRepository messageRepository;
    MessageMapper messageMapper;
    MessageBroadcaster broadcaster;

    @RabbitListener(queues = "nexawork.messaging.call-ended")
    @Transactional
    public void onCallEnded(CallEndedEvent event) {
        log.info("Réception call.ended : appel {} (projet {})", event.callId(), event.projectId());
        if (event.projectId() == null) {
            log.debug("call.ended sans projectId — pas de canal projet, ignoré");
            return;
        }

        Channel general = channelRepository
                .findByProjectIdAndNameAndIsSystemTrue(event.projectId(), ProjectCreatedConsumer.CHANNEL_GENERAL)
                .orElse(null);
        if (general == null) {
            log.debug("Canal « général » introuvable pour projet {} — message système ignoré", event.projectId());
            return;
        }

        long minutes = event.durationSeconds() != null ? Math.round(event.durationSeconds() / 60.0) : 0;
        String topic = event.topic() != null ? event.topic() : "Réunion";
        Message message = messageRepository.save(Message.builder()
                .channel(general)
                .conversationId(null)
                .senderUserId(event.hostUserId())
                .content("Réunion « " + topic + " » terminée — Durée : " + minutes + " min")
                .messageType(MessageType.SYSTEM)
                .isDeleted(false)
                .edited(false)
                .build());

        MessageResponse dto = messageMapper.asDto(message);
        broadcaster.broadcastChannelMessage(general.getId(), dto);
        log.info("Message système « réunion terminée » posté dans le canal {} du projet {}",
                general.getId(), event.projectId());
    }
}
