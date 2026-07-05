package com.nexawork.project.services;

import com.nexawork.project.dtos.requests.CreateAttachmentRequest;
import com.nexawork.project.dtos.responses.AttachmentResponse;
import com.nexawork.project.dtos.responses.TaskAttachmentAggregateResponse;

import java.util.List;
import java.util.UUID;

/**
 * Pièces jointes de tâches (§13.2). Réservées aux membres du projet (R15) ;
 * refusées si projet archivé (REF E). Expose aussi l'agrégat projet consommé en
 * HTTP synchrone par le GED (§10.5bis).
 */
public interface TaskAttachmentService {

    List<AttachmentResponse> listAttachments(UUID taskId);

    AttachmentResponse addAttachment(UUID taskId, CreateAttachmentRequest request);

    void deleteAttachment(UUID taskId, UUID attachmentId);

    /** Agrégat de toutes les pièces jointes des tâches d'un projet (dossier virtuel GED). */
    List<TaskAttachmentAggregateResponse> listProjectAttachments(UUID projectId);
}
