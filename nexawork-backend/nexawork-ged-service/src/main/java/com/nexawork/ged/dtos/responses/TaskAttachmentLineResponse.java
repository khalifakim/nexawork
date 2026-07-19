package com.nexawork.ged.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Ligne virtuelle du dossier système « Pièces jointes aux tâches » (§10.5bis,
 * §11.2). Construite à la volée depuis le TaskAttachment du Project Service —
 * jamais persistée en base GED. Peuplée au Lot 6D. {@code readOnly} toujours vrai.
 */
@Data
@Builder
public class TaskAttachmentLineResponse {

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
    private boolean readOnly;
    private String contextType; // "TASK_ATTACHMENT"
}
