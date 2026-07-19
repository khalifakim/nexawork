package com.nexawork.project.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Mention reçue dans un commentaire (onglet « Commentaires » de « Mentions reçues »).
 * Le lien ouvre la fiche de tâche ({@code taskId}) ancrée sur le commentaire
 * ({@code commentId}).
 */
@Data
@Builder
public class ReceivedCommentMentionResponse {

    private UUID commentId;
    private UUID taskId;
    private String taskKey;
    private String taskTitle;
    private UUID projectId;
    private String projectName;
    private UUID authorUserId;
    private String excerpt;
    private LocalDateTime createdAt;
}
