package com.nexawork.notification.entities.enums;

/**
 * Type de notification (V5.1 §6.6). Chaque type porte une politique de canaux
 * (in-app / email / push) figée par le système — voir {@code NotificationPolicy}.
 */
public enum NotificationType {
    MEMBER_INVITED,
    EXTERNAL_GUEST_INVITED,
    ADDED_TO_PROJECT,
    TASK_ASSIGNED,
    LIVRABLE_VALIDATED,
    MENTION,
    MESSAGE_RECEIVED,
    DOCUMENT_SHARED,
    MEETING_INVITED,
    CALL_ENDED
}
