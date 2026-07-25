package com.nexawork.notification.services;

import com.nexawork.notification.dtos.responses.NotificationPageResponse;
import com.nexawork.notification.entities.enums.NotificationType;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Consultation des notifications de l'utilisateur courant (§13.7).
 */
public interface NotificationService {

    /** Liste paginée ; {@code types} vide/null = tous les types (filtre par type sinon). */
    NotificationPageResponse list(boolean unreadOnly, List<NotificationType> types, int page, int size);

    /**
     * Compte des non-lues par workspace (tous espaces de l'utilisateur courant).
     * Clé = id du workspace, valeur = nombre de non-lues. Sert l'indicateur discret
     * du sélecteur d'espace ; n'expose aucun contenu de notification.
     */
    Map<UUID, Long> unreadCountByWorkspace();

    void markRead(UUID id);

    void hide(UUID id);

    /** Supprime définitivement une notification (l'utilisateur, depuis son menu). */
    void delete(UUID id);
}
