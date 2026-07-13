package com.nexawork.ged.dtos.requests;

import com.nexawork.ged.entities.enums.AccessMode;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

/**
 * Ajout d'un fichier GED (§11.4). Le binaire est stocké au préalable par le File
 * Service ; ici on enregistre la métadonnée GED + l'URL et la réf. StoredFile.
 */
@Data
public class CreateFileRequest {

    /** Dossier cible, ou {@code null} pour déposer le fichier à la racine (V2). */
    private UUID folderId;

    /**
     * Espace racine visé quand {@code folderId} est null : {@code null} = racine
     * de l'espace Organisation, sinon racine de l'espace du projet. Ignoré si un
     * dossier est fourni (le scope projet est alors hérité du dossier).
     */
    private UUID projectId;

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
