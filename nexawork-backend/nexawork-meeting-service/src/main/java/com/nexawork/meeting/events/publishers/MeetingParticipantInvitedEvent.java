package com.nexawork.meeting.events.publishers;

import java.util.UUID;

/**
 * Publié (routing {@code meeting.participant.invited}) quand un membre interne est
 * invité à une réunion — un event par destinataire. Consommé par le Notification
 * Service → notification in-app + push « réunion en cours — Rejoindre ».
 */
public record MeetingParticipantInvitedEvent(
        UUID callId,
        String topic,
        UUID organisationId,
        UUID inviterUserId,
        String inviterDisplayName,
        UUID recipientUserId) {
}
