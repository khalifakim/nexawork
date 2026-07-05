package com.nexawork.notification.dtos.responses;

import com.nexawork.notification.entities.enums.NotificationType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Notification (§13.7). Diffusée telle quelle sur WebSocket au destinataire.
 */
@Data
@Builder
public class NotificationResponse {

    private UUID id;
    private UUID recipientUserId;
    private NotificationType type;
    private String title;
    private String body;
    private String targetUrl;
    private Boolean read;
    private UUID workspaceId;
    private Map<String, Object> payload;
    private LocalDateTime createdAt;
}
