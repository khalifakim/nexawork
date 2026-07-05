package com.nexawork.meeting.events.publishers;

import java.util.UUID;

/**
 * Payload de {@code call.ended} (V5.1 §7.2) — consommé par Messaging (message
 * système dans le canal du projet) et Notification (notif CALL_ENDED à l'hôte).
 */
public record CallEndedEvent(
        UUID callId,
        String topic,
        String roomName,
        UUID organisationId,
        UUID projectId,
        UUID hostUserId,
        Long durationSeconds) {
}
