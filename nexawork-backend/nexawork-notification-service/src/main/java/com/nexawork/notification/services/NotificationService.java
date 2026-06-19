package com.nexawork.notification.services;

import com.nexawork.notification.dtos.responses.NotificationResponse;
import com.nexawork.notification.entities.Notification;
import com.nexawork.notification.entities.enums.NotificationType;
import com.nexawork.notification.repositories.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepo;
    private final SimpMessagingTemplate messagingTemplate;
    private final RedisTemplate<String, Object> redisTemplate;

    @Transactional
    public NotificationResponse createAndPush(Long recipientUserId, NotificationType type,
                                               String title, String body, String targetUrl,
                                               Long workspaceId, String payload) {
        Notification notif = Notification.builder()
            .recipientUserId(recipientUserId)
            .type(type)
            .title(title)
            .body(body)
            .targetUrl(targetUrl)
            .workspaceId(workspaceId)
            .payload(payload)
            .build();
        notificationRepo.save(notif);

        NotificationResponse response = toResponse(notif);
        messagingTemplate.convertAndSendToUser(
            recipientUserId.toString(), "/notifications", response);
        return response;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(Long userId) {
        return notificationRepo.findByRecipientUserIdOrderByCreatedAtDesc(userId).stream()
            .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return notificationRepo.findByRecipientUserIdAndReadFalse(userId).size();
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepo.markAllAsRead(userId);
    }

    public void setPresence(Long userId, boolean online) {
        String key = "presence:" + userId;
        if (online) {
            redisTemplate.opsForValue().set(key, "online", Duration.ofMinutes(5));
        } else {
            redisTemplate.delete(key);
        }
    }

    public boolean isOnline(Long userId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey("presence:" + userId));
    }

    @Transactional
    public void hideNotification(Long notifId, Long userId) {
        Notification notif = notificationRepo.findById(notifId)
            .orElseThrow(() -> new RuntimeException("Notification introuvable : " + notifId));
        if (!notif.getRecipientUserId().equals(userId)) {
            throw new RuntimeException("Accès refusé");
        }
        notif.setIsHidden(true);
        notificationRepo.save(notif);
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(n.getId(), n.getRecipientUserId(), n.getWorkspaceId(),
            n.getType(), n.getTitle(), n.getBody(), n.getTargetUrl(), n.getPayload(),
            n.getRead(), n.getIsHidden(), n.getCreatedAt());
    }
}
