package com.nexawork.meeting.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

/**
 * Fichier partagé dans la salle (M5). Le binaire a **déjà** été téléversé au
 * File Service (contexte {@code meeting-file} → MinIO) : la requête n'en porte
 * que la référence. Le Meeting Service ne manipule aucun octet.
 */
@Data
public class ShareMeetingFileRequest {

    /** Réf. du {@code StoredFile} rendu par le File Service. */
    @NotNull
    private UUID fileId;

    /** URL de téléchargement stable rendue par le File Service. */
    @Size(max = 1024)
    private String downloadUrl;

    @NotBlank
    @Size(max = 512)
    private String fileName;

    private Long fileSize;

    @Size(max = 255)
    private String contentType;
}
