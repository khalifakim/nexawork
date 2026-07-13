package com.nexawork.messaging.events.publishers;

import java.util.UUID;

/**
 * {@code message.mention} — un utilisateur vient d'être mentionné dans un message
 * (V5.1 §4.7 : la mention notifie la personne visée). Consommé par le
 * Notification Service.
 *
 * <p>{@code channelName} / {@code conversationId} portent le contexte affiché
 * dans la notification et servent à construire le lien d'ouverture.</p>
 */
public record MessageMentionEvent(
        UUID messageId,
        UUID recipientUserId,
        UUID authorUserId,
        UUID organisationId,
        String excerpt,
        UUID channelId,
        String channelName,
        UUID conversationId) {
}
