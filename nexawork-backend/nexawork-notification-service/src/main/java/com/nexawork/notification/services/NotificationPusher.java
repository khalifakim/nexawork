package com.nexawork.notification.services;

import com.nexawork.notification.dtos.responses.NotificationResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Push temps réel d'une notification vers le destinataire connecté (V5.1 §7.5,
 * §13.7) : {@code /user/{userId}/queue/notifications}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationPusher {

    SimpMessagingTemplate messagingTemplate;

    public void push(UUID userId, NotificationResponse notification) {
        messagingTemplate.convertAndSendToUser(userId.toString(), "/queue/notifications", notification);
        log.debug("Notification {} poussée à /user/{}/queue/notifications", notification.getId(), userId);
    }
}
