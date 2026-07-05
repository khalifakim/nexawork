package com.nexawork.project.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Pièce jointe d'une tâche (§13.2).
 */
@Data
@Builder
public class AttachmentResponse {

    private UUID id;
    private UUID taskId;
    private String fileName;
    private String fileUrl;
    private Long fileSize;
    private String contentType;
    private UUID uploadedByUserId;
    private LocalDateTime uploadedAt;
}
