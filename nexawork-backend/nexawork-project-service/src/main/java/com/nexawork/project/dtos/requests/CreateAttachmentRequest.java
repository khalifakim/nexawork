package com.nexawork.project.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Ajout d'une pièce jointe à une tâche (§13.2). La référence physique (upload
 * MinIO) est gérée par le File Service ; ici on enregistre la métadonnée +
 * l'URL présignée. Consultée par le GED via l'endpoint synchrone task-attachments.
 */
@Data
public class CreateAttachmentRequest {

    @NotBlank(message = "est obligatoire")
    private String fileName;

    @NotBlank(message = "est obligatoire")
    private String fileUrl;

    private Long fileSize;

    private String contentType;
}
