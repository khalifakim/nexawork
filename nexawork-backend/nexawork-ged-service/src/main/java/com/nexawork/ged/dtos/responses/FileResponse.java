package com.nexawork.ged.dtos.responses;

import com.nexawork.ged.entities.enums.AccessMode;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Fichier GED (§11.2).
 */
@Data
@Builder
public class FileResponse {

    private UUID id;
    private UUID folderId;
    private String name;
    private String fileUrl;
    private Long fileSize;
    private String contentType;
    private UUID sourceFileId;
    private UUID projectId;
    private AccessMode accessMode;
    private boolean restricted;
    private UUID addedByUserId;
    private LocalDateTime addedAt;
    private LocalDateTime deletedAt;
    /**
     * Déposant EXTERNE (lien de partage, Brique 4) : nom saisi, « Anonyme » si le
     * dépôt était anonyme, ou {@code null} pour un import interne d'un membre. Non
     * nul ⇒ le fichier vient d'un dépôt externe ; l'UI doit l'afficher comme auteur
     * plutôt que {@code addedByUserId} (qui reste le créateur du lien).
     */
    private String externalUploaderName;
    /** E-mail éventuel du déposant externe (facultatif, peut être nul même nommé). */
    private String externalUploaderEmail;
}
