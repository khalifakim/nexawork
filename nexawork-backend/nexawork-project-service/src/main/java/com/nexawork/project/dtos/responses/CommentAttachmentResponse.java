package com.nexawork.project.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/**
 * Pièce jointe d'un commentaire de tâche (§13.2).
 */
@Data
@Builder
public class CommentAttachmentResponse {

    private UUID id;
    private String fileName;
    private String fileUrl;
    private Long fileSize;
    private String contentType;
}
