package com.nexawork.project.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Ligne agrégée de l'endpoint {@code GET /projects/{id}/task-attachments}
 * (§13.2, §10.5bis) : pièce jointe enrichie de l'information de tâche
 * ({@code taskId}, {@code taskTitle}), sans dédoublonnage par fichier physique.
 * Consommé en HTTP synchrone par le GED Service pour le dossier virtuel
 * « Pièces jointes aux tâches ».
 */
@Data
@Builder
public class TaskAttachmentAggregateResponse {

    private UUID attachmentId;
    private UUID taskId;
    /** Identifiant lisible de la tâche (PREFIX-NNN) — affiché dans la GED. */
    private String taskKey;
    private String taskTitle;
    private String fileName;
    private String fileUrl;
    private Long fileSize;
    private String contentType;
    private UUID uploadedByUserId;
    private LocalDateTime uploadedAt;
}
