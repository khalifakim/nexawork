package com.nexawork.auth.events.publishers;

import java.util.UUID;

/**
 * Payload de l'événement `member.invited` (V5.1 §7.2) — consommé par le
 * Notification Service (queue nexawork.notification.member-invited).
 */
public record MemberInvitedEvent(
        UUID organisationId,
        String organisationName,
        String inviteeEmail,
        String inviterDisplayName,
        String invitationToken) {
}
