package com.nexawork.messaging.dtos.responses;

import com.nexawork.messaging.entities.enums.MentionType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Mention extraite d'un message (§6.4, §5.3).
 *
 * <p>Les champs de contexte ({@code authorUserId}, {@code messageContent},
 * {@code channelId}/{@code conversationId}) alimentent la vue « Mentions
 * reçues » (§5.3) : qui m'a mentionné, dans quel extrait, et où cliquer.</p>
 */
@Data
@Builder
public class MentionResponse {

    private UUID id;
    private UUID messageId;
    private MentionType mentionType;
    private UUID targetId;
    private String targetText;
    private Boolean isRead;
    private LocalDateTime createdAt;

    /** Auteur du message contenant la mention. */
    private UUID authorUserId;
    /** Contenu du message (extrait affiché sous la mention). */
    private String messageContent;
    /** Canal d'origine (exclusif avec {@code conversationId}). */
    private UUID channelId;
    /** Nom du canal d'origine, pour l'affichage du contexte. */
    private String channelName;
    /** Conversation d'origine (exclusif avec {@code channelId}). */
    private UUID conversationId;
}
