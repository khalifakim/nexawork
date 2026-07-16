package com.nexawork.project.dtos.requests;

import jakarta.validation.Valid;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

    /**
     * Cibles de mention (USER) résolues par le client — comme le Messaging, le
     * domaine Project ne résout pas les identités. Sert à notifier les personnes
     * mentionnées et à alimenter l'onglet « Commentaires » de « Mentions reçues ».
     */
    private List<MentionInput> mentions = new ArrayList<>();

    @Data
    public static class MentionInput {
        private UUID targetId;
        private String targetText;
    }
}
