package com.nexawork.notification.services;

import com.nexawork.notification.dtos.responses.NotificationResponse;
import com.nexawork.notification.entities.Notification;
import com.nexawork.notification.entities.enums.NotificationType;
import com.nexawork.notification.mappers.NotificationMapper;
import com.nexawork.notification.repositories.NotificationRepository;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * Point d'entrée unique de création d'une notification (utilisé par tous les
 * consumers). Applique la politique de canaux (§4.7) :
 * <ol>
 *   <li><b>in-app</b> : persistée si un destinataire interne existe ({@code recipientUserId}) ;</li>
 *   <li><b>WebSocket</b> : poussée en temps réel au destinataire connecté ;</li>
 *   <li><b>email</b> : envoyée si le type le prévoit et qu'une adresse est fournie.</li>
 * </ol>
 * Le push Web (fallback offline) est branché au Lot 8C.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationCreator {

    NotificationRepository notificationRepository;
    NotificationMapper notificationMapper;
    NotificationPusher pusher;
    EmailSender emailSender;

    /** Commande de création (champs cross-services fournis par le consumer). */
    @Getter
    @Builder
    public static class Command {
        private final UUID recipientUserId;   // null pour un invité externe (email seul)
        private final String recipientEmail;  // fourni par l'event si disponible
        private final NotificationType type;
        private final String title;
        private final String body;
        private final String targetUrl;
        private final UUID workspaceId;
        private final Map<String, Object> payload;
    }

    @Transactional
    public void create(Command cmd) {
        // 1) in-app (si destinataire interne)
        if (cmd.getRecipientUserId() != null) {
            Notification notification = notificationRepository.save(Notification.builder()
                    .recipientUserId(cmd.getRecipientUserId())
                    .type(cmd.getType())
                    .title(cmd.getTitle())
                    .body(cmd.getBody())
                    .targetUrl(cmd.getTargetUrl())
                    .read(false)
                    .isHidden(false)
                    .workspaceId(cmd.getWorkspaceId())
                    .payload(cmd.getPayload())
                    .build());

            NotificationResponse dto = notificationMapper.asDto(notification);
            // 2) WebSocket temps réel
            pusher.push(cmd.getRecipientUserId(), dto);
            log.info("Notification {} ({}) créée pour {}", notification.getId(), cmd.getType(), cmd.getRecipientUserId());
        }

        // 3) email (politique §4.7) — si type concerné et adresse disponible
        if (NotificationPolicy.emailEnabled(cmd.getType()) && cmd.getRecipientEmail() != null) {
            String body = (cmd.getBody() != null ? cmd.getBody() + "\n\n" : "")
                    + (cmd.getTargetUrl() != null ? cmd.getTargetUrl() : "");
            emailSender.send(cmd.getRecipientEmail(), cmd.getTitle(), body);
        }
    }
}
