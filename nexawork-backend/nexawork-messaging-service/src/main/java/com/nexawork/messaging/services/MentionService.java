package com.nexawork.messaging.services;

import com.nexawork.messaging.dtos.responses.MentionResponse;

import java.util.List;
import java.util.UUID;

/**
 * Vue « Mentions reçues » (§13.5, §5.3). Mentions USER ciblant l'utilisateur
 * courant, avec état lu/non-lu.
 *
 * <p><b>Best-effort (documenté)</b> : la vue complète agrège aussi les mentions
 * dans les commentaires de tâches (TaskComment, domaine Project) — non accessible
 * ici. Cette implémentation couvre les mentions du Messaging ; l'agrégation
 * cross-service relève d'une composition frontend.</p>
 */
public interface MentionService {

    List<MentionResponse> listReceived(boolean onlyUnread);

    void markRead(UUID mentionId);

    void markAllRead();
}
