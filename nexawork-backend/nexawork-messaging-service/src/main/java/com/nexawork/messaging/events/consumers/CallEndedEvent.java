package com.nexawork.messaging.events.consumers;

import java.util.UUID;

/**
 * Payload de {@code call.ended} (V5.1 §7.2), publié par le Meeting Service.
 * Consommé pour poster un message système dans le canal du projet.
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
