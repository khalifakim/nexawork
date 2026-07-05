package com.nexawork.notification.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Page de notifications (§13.7) + compteur de non-lues (badge cloche).
 */
@Data
@Builder
public class NotificationPageResponse {

    private List<NotificationResponse> notifications;
    private long unreadCount;
    private int page;
    private int totalPages;
    private long totalElements;
}
