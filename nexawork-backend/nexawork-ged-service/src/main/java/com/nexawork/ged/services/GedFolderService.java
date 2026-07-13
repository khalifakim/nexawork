package com.nexawork.ged.services;

import com.nexawork.ged.dtos.requests.CreateFolderRequest;
import com.nexawork.ged.dtos.requests.UpdateFolderRequest;
import com.nexawork.ged.dtos.responses.FolderContentResponse;
import com.nexawork.ged.dtos.responses.FolderResponse;

import java.util.List;
import java.util.UUID;

/**
 * Dossiers GED (§13.4). Visibilité REF G (404), R12 (suppression créateur+ADMIN),
 * rejets sur le dossier système TASK_ATTACHMENTS (403). Le contenu du dossier
 * système (virtuel) est traité au Lot 6D.
 */
public interface GedFolderService {

    /** Racines d'un scope : GED organisation ({@code projectId} nul) ou GED projet. */
    List<FolderResponse> listRootFolders(UUID projectId);

    FolderResponse createFolder(CreateFolderRequest request);

    FolderContentResponse getContent(UUID folderId);

    FolderResponse updateFolder(UUID folderId, UpdateFolderRequest request);

    /** Soft-delete (corbeille). */
    void deleteFolder(UUID folderId);

    /** Corbeille (R11) : dossiers mis à la corbeille par l'appelant. */
    List<FolderResponse> trashedFolders();

    /** Restaure un dossier depuis la corbeille. */
    FolderResponse restoreFolder(UUID folderId);

    /** Supprime définitivement un dossier de la corbeille (et son contenu). */
    void purgeFolder(UUID folderId);
}
