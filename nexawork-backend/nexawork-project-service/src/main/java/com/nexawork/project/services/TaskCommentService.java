package com.nexawork.project.services;

import com.nexawork.project.dtos.requests.CreateCommentRequest;
import com.nexawork.project.dtos.responses.CommentResponse;

import java.util.List;
import java.util.UUID;

/**
 * Commentaires d'une tâche (§13.2). Réservés aux membres du projet (R15) ;
 * suppression réservée à l'auteur ou à un administrateur ; refusés si projet
 * archivé (REF E).
 */
public interface TaskCommentService {

    List<CommentResponse> listComments(UUID taskId);

    CommentResponse addComment(UUID taskId, CreateCommentRequest request);

    void deleteComment(UUID taskId, UUID commentId);
}
