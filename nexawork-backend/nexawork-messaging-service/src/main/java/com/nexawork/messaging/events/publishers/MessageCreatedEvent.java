package com.nexawork.messaging.events.publishers;

import java.util.List;
import java.util.UUID;

/**
 * {@code message.created} — un nouveau message vient d'être posté ; les
 * destinataires concernés doivent recevoir une notification (§4.7). Consommé par
 * le Notification Service.
 *
 * <p>Politique de destinataires (décidée avec le porteur) : <b>conversation
 * directe</b> → l'autre participant ; <b>canal privé</b> → ses membres explicites
 * (hors auteur). Les <b>canaux publics</b> n'émettent PAS cet événement (ils
 * s'appuient sur le badge « non lus »), pour éviter de notifier tout l'espace à
 * chaque message.</p>
 *
 * <p>{@code channelId} non nul ⇒ message de canal ; sinon {@code conversationId}
 * porte la conversation. {@code recipientUserIds} liste les destinataires.</p>
 */
public record MessageCreatedEvent(
        UUID messageId,
        List<UUID> recipientUserIds,
        UUID authorUserId,
        String authorDisplayName,
        UUID organisationId,
        String excerpt,
        UUID channelId,
        String channelName,
        UUID conversationId) {
}
