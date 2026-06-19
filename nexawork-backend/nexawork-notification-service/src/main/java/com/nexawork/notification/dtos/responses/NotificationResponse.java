package com.nexawork.notification.dtos.responses;

import com.nexawork.notification.entities.enums.NotificationType;

import java.time.LocalDateTime;

public record NotificationResponse(
    Long id,
    Long recipientUserId,
    Long workspaceId,
    NotificationType type,
    String title,
    String body,
    String targetUrl,
    String payload,
    Boolean read,
    Boolean isHidden,
    LocalDateTime createdAt
) {}
