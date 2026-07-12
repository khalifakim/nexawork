package com.nexawork.messaging.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Pièce jointe d'un message (§4.5). Portée par {@link MessageResponse#getAttachments()}.
 */
@Data
@Builder
public class MessageAttachmentResponse {

    private UUID id;
    private String fileName;
    private String fileUrl;
    private UUID uploaderUserId;
    private LocalDateTime uploadedAt;
}
