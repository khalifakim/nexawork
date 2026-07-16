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
            UUID organisationId, UUID assigneeUserId, UUID assignerUserId) {
    }

    /** Nouveau commentaire sur une tâche : tous les membres du projet (hors auteur). */
    public record TaskCommented(
            UUID taskId, String taskKey, String taskTitle, UUID projectId, String projectName,
            UUID organisationId, UUID authorUserId, String excerpt, java.util.List<UUID> recipientUserIds) {
    }

    public record LivrableValidated(
            UUID taskId, String taskTitle, UUID projectId, String projectName,
            UUID organisationId, UUID validatedByUserId, UUID assigneeUserId) {
    }

    public record CallEnded(
            UUID callId, String topic, String roomName, UUID organisationId,
            UUID hostUserId, Long durationSeconds) {
    }

    public record ExternalGuestInvited(
            UUID callId, String topic, String guestEmail, String guestDisplayName,
            String guestToken, UUID inviterUserId) {
    }

    /** {@code message.mention} — quelqu'un a été mentionné dans un message (§4.7). */
    public record MessageMentioned(
            UUID messageId, UUID recipientUserId, UUID authorUserId, String authorDisplayName,
            UUID organisationId, String excerpt, UUID channelId, String channelName,
            UUID conversationId) {
    }

    public record MeetingParticipantInvited(
            UUID callId, String topic, UUID organisationId,
            UUID inviterUserId, String inviterDisplayName, UUID recipientUserId) {
    }

    /** {@code message.created} — nouveau message (DM / canal privé) à notifier (§4.7). */
    public record MessageCreated(
            UUID messageId, java.util.List<UUID> recipientUserIds, UUID authorUserId,
            String authorDisplayName, UUID organisationId, String excerpt,
            UUID channelId, String channelName, UUID conversationId) {
    }
}
