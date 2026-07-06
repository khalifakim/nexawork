package com.nexawork.notification.events.consumers;

import java.util.UUID;

/**
 * Payloads des événements consommés par le Notification Service (V5.1 §7.2), tels
 * que publiés par les autres services. Regroupés ici comme records imbriqués.
 */
public final class Events {

    private Events() {
    }

    public record MemberInvited(
            UUID organisationId, String organisationName, String inviteeEmail,
            String inviterDisplayName, String invitationToken) {
    }

    public record TaskAssigned(
            UUID taskId, String taskTitle, UUID projectId, String projectName,
            UUID assigneeUserId, UUID assignerUserId) {
    }

    public record LivrableValidated(
            UUID taskId, String taskTitle, UUID projectId, String projectName,
            UUID validatedByUserId, UUID assigneeUserId) {
    }

    public record CallEnded(
            UUID callId, String topic, String roomName, UUID organisationId,
            UUID projectId, UUID hostUserId, Long durationSeconds) {
    }

    public record ExternalGuestInvited(
            UUID callId, String topic, String guestEmail, String guestDisplayName,
            String guestToken, UUID inviterUserId) {
    }

    public record MeetingParticipantInvited(
            UUID callId, String topic, UUID organisationId, UUID projectId,
            UUID inviterUserId, String inviterDisplayName, UUID recipientUserId) {
    }
}
