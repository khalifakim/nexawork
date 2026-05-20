package com.nexawork.notification.dtos.responses;

import com.nexawork.notification.entities.enums.NotificationType;

import java.time.LocalDateTime;

public record NotificationResponse(
    Long id,
    Long recipientUserId,
    NotificationType type,
    String title,
    String body,
    String targetUrl,
    Boolean read,
    LocalDateTime createdAt
) {}
