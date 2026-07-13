package com.nexawork.project.dtos.requests;

import jakarta.validation.Valid;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Ajout d'un commentaire de tâche (§13.2). Le contenu peut porter des mentions
 * (parsées en aval par le Messaging Service) et des pièces jointes. Le texte est
 * optionnel dès lors qu'au moins un fichier est joint (commentaire « fichier
 * seul ») — validé dans le service.
 */
@Data
public class CreateCommentRequest {

    private String content;

    /** Fichiers joints (déjà stockés par le File Service) — optionnel. */
    @Valid
    private List<CommentAttachmentRequest> attachments = new ArrayList<>();
}
