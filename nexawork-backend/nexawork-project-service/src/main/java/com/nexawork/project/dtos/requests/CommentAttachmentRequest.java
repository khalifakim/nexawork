package com.nexawork.project.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Métadonnées d'un fichier joint à un commentaire. Le fichier est d'abord
 * poussé au File Service (bucket task-attachment) ; on transmet ici son nom et
 * son URL de téléchargement stable.
 */
@Data
public class CommentAttachmentRequest {

    @NotBlank(message = "est obligatoire")
    private String fileName;

    @NotBlank(message = "est obligatoire")
    private String fileUrl;

    private Long fileSize;

    private String contentType;
}
