package com.nexawork.messaging.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Conversation directe (§13.5). {@code participantUserIds} liste les deux membres.
 */
@Data
@Builder
public class ConversationResponse {

    private UUID id;
    private UUID workspaceId;
    private String type;
    private List<UUID> participantUserIds;
    /** Conserve la sémantique « tout est lu » (= {@code unreadCount == 0}). */
    private Boolean isRead;
    /** Vrai nombre de messages non lus reçus par l'appelant (badge). */
    private Long unreadCount;
    private LocalDateTime createdAt;
}
