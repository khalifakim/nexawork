package com.nexawork.notification.services;

import com.nexawork.notification.entities.enums.NotificationType;

import java.util.Set;

/**
 * Politique de canaux figée par le système (V5.1 §4.7). Toute notification est
 * in-app ; l'email s'ajoute statiquement pour une liste précise de types à valeur
 * durable ; le push Web est tenté pour les types marqués (fallback offline, Lot 8C).
 */
public final class NotificationPolicy {

    private NotificationPolicy() {
    }

    /** Types déclenchant un email (SMTP), indépendamment de la présence. */
    private static final Set<NotificationType> EMAIL = Set.of(
            NotificationType.MEMBER_INVITED,
            NotificationType.EXTERNAL_GUEST_INVITED,
            NotificationType.ADDED_TO_PROJECT,
            NotificationType.DOCUMENT_SHARED);

    /** Types éligibles au push Web (tenté si l'utilisateur est hors ligne). */
    private static final Set<NotificationType> PUSH = Set.of(
            NotificationType.ADDED_TO_PROJECT,
            NotificationType.TASK_ASSIGNED,
            NotificationType.LIVRABLE_VALIDATED,
            NotificationType.MENTION,
            NotificationType.MESSAGE_RECEIVED,
            NotificationType.DOCUMENT_SHARED,
            NotificationType.MEETING_INVITED);

    public static boolean emailEnabled(NotificationType type) {
        return EMAIL.contains(type);
    }

    public static boolean pushEnabled(NotificationType type) {
        return PUSH.contains(type);
    }
}
