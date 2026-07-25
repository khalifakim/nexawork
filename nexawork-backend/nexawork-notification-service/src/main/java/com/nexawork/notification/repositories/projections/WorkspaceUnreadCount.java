package com.nexawork.notification.repositories.projections;

import java.util.UUID;

/**
 * Projection agrégée : nombre de notifications non lues par workspace pour un
 * utilisateur. Alimente l'indicateur discret « des non-lus ailleurs » du
 * sélecteur d'espace (façon Slack), sans exposer le contenu des notifications
 * des autres espaces — l'isolation par workspace reste préservée.
 */
public interface WorkspaceUnreadCount {

    UUID getWorkspaceId();

    long getUnread();
}
