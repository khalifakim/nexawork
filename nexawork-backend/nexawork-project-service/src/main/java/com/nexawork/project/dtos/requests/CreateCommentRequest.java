package com.nexawork.project.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Ajout d'un commentaire de tâche (§13.2). Le contenu peut porter des mentions
 * (parsées en aval par le Messaging Service).
 */
@Data
public class CreateCommentRequest {

    @NotBlank(message = "est obligatoire")
    private String content;
}
