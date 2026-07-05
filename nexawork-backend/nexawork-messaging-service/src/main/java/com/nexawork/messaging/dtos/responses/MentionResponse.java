package com.nexawork.messaging.dtos.responses;

import com.nexawork.messaging.entities.enums.MentionType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Mention extraite d'un message (§6.4, §5.3).
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
}
