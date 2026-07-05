package com.nexawork.ged.dtos.requests;

import com.nexawork.ged.entities.enums.AccessMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

/**
 * Ajout d'un fichier GED (§11.4). Le binaire est stocké au préalable par le File
 * Service ; ici on enregistre la métadonnée GED + l'URL et la réf. StoredFile.
 */
@Data
public class CreateFileRequest {

    @NotNull(message = "est obligatoire")
    private UUID folderId;

    @NotBlank(message = "est obligatoire")
    private String name;

    @NotBlank(message = "est obligatoire")
    private String fileUrl;

    private Long fileSize;

    private String contentType;

    /** Réf. StoredFile (File Service), recommandée. */
    private UUID sourceFileId;

    private AccessMode accessMode;
}
