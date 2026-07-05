package com.nexawork.ged.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Contenu d'un dossier (§13.4). Pour un dossier USER : sous-dossiers + fichiers
 * (filtrés REF G). Pour le dossier système TASK_ATTACHMENTS (Lot 6D) : lignes
 * virtuelles calculées via le Project Service (non peuplées ici).
 */
@Data
@Builder
public class FolderContentResponse {

    private FolderResponse folder;
    private List<FolderResponse> subFolders;
    private List<FileResponse> files;
    /** Contenu virtuel du dossier système (rempli au Lot 6D uniquement). */
    private List<TaskAttachmentLineResponse> taskAttachments;
}
