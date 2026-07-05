package com.nexawork.notification.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexawork.notification.dtos.responses.NotificationResponse;
import com.nexawork.notification.entities.Notification;
import com.nexawork.notification.entities.enums.NotificationType;
import com.nexawork.notification.mappers.NotificationMapper;
import com.nexawork.notification.repositories.NotificationRepository;
import com.nexawork.notification.repositories.PushSubscriptionRepository;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
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
    PresenceService presenceService;
    WebPushSender webPushSender;
    PushSubscriptionRepository pushSubscriptionRepository;
    ObjectMapper objectMapper;

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

            // 2bis) Web Push — fallback : uniquement si le type l'autorise ET que
            // l'utilisateur est HORS LIGNE (aucune session WebSocket). En ligne, il
            // a déjà reçu la notif via WebSocket → pas de doublon (§4.7).
            if (NotificationPolicy.pushEnabled(cmd.getType())
                    && !presenceService.isOnline(cmd.getRecipientUserId())) {
                sendWebPush(cmd);
            }
        }

        // 3) email (politique §4.7) — si type concerné et adresse disponible
        if (NotificationPolicy.emailEnabled(cmd.getType()) && cmd.getRecipientEmail() != null) {
            String body = (cmd.getBody() != null ? cmd.getBody() + "\n\n" : "")
                    + (cmd.getTargetUrl() != null ? cmd.getTargetUrl() : "");
            emailSender.send(cmd.getRecipientEmail(), cmd.getTitle(), body);
        }
    }

    /** Envoie le push Web à tous les abonnements du destinataire (best-effort). */
    private void sendWebPush(Command cmd) {
        var subscriptions = pushSubscriptionRepository.findByUserId(cmd.getRecipientUserId());
        if (subscriptions.isEmpty()) {
            return;
        }
        String json = pushPayload(cmd);
        subscriptions.forEach(sub -> webPushSender.send(sub, json));
        log.debug("Web Push tenté ({} abonnement(s)) pour {} hors ligne",
                subscriptions.size(), cmd.getRecipientUserId());
    }

    private String pushPayload(Command cmd) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("title", cmd.getTitle());
        data.put("body", cmd.getBody());
        data.put("url", cmd.getTargetUrl());
        try {
            return objectMapper.writeValueAsString(data);
        } catch (Exception e) {
            return "{\"title\":\"" + cmd.getTitle() + "\"}";
        }
    }
}
