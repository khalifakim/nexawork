package com.nexawork.ged.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/**
 * Une ligne de fichier exposée publiquement (lien READ sur un dossier). Strict
 * minimum pour lister et télécharger : ni auteur, ni dates, ni scope interne.
 */
@Data
@Builder
public class PublicShareFileResponse {

    private UUID id;
    private String name;
    private String contentType;
    private Long fileSize;
}
