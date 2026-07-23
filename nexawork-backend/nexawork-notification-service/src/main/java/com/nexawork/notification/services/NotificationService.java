package com.nexawork.notification.services;

import com.nexawork.notification.dtos.responses.NotificationPageResponse;
import com.nexawork.notification.entities.enums.NotificationType;

import java.util.List;
import java.util.UUID;

/**
 * Consultation des notifications de l'utilisateur courant (§13.7).
 */
public interface NotificationService {

    /** Liste paginée ; {@code types} vide/null = tous les types (filtre par type sinon). */
    NotificationPageResponse list(boolean unreadOnly, List<NotificationType> types, int page, int size);

    void markRead(UUID id);

    void hide(UUID id);

    /** Supprime définitivement une notification (l'utilisateur, depuis son menu). */
    void delete(UUID id);
}
