package com.nexawork.messaging.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Fichier joint d'un fil (§13.5 — {@code GET /threads/{id}/attachments}, panneau
 * « Fichiers joints » §12.4.1).
 */
@Data
@Builder
public class ThreadAttachmentResponse {

    private UUID messageId;
    private String fileName;
    private String fileUrl;
    private UUID uploaderId;
    private LocalDateTime uploadedAt;
}
