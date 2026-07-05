package com.nexawork.notification.services;

import com.nexawork.notification.dtos.responses.NotificationPageResponse;

import java.util.UUID;

/**
 * Consultation des notifications de l'utilisateur courant (§13.7).
 */
public interface NotificationService {

    NotificationPageResponse list(boolean unreadOnly, int page, int size);

    void markRead(UUID id);

    void hide(UUID id);
}
