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
    private Boolean isRead;
    private LocalDateTime createdAt;
}
