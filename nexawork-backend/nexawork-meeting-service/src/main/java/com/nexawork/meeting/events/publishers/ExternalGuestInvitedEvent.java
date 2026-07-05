package com.nexawork.meeting.events.publishers;

import java.util.UUID;

/**
 * Payload de {@code external.guest.invited} (V5.1 §7.2) — consommé par
 * Notification (email d'invitation à l'invité externe).
 */
public record ExternalGuestInvitedEvent(
        UUID callId,
        String topic,
        String guestEmail,
        String guestDisplayName,
        String guestToken,
        UUID inviterUserId) {
}
