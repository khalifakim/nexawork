package com.nexawork.ged.services;

import com.nexawork.ged.dtos.requests.CreateFileRequest;
import com.nexawork.ged.dtos.requests.UpdateFileRequest;
import com.nexawork.ged.dtos.responses.FileResponse;

import java.util.List;
import java.util.UUID;

/**
 * Fichiers GED (§13.4). Visibilité REF G (404), R12 (suppression créateur+ADMIN),
 * corbeille (soft-delete) filtrée par utilisateur (R11), rejet d'ajout dans le
 * dossier système TASK_ATTACHMENTS (403).
 */
public interface GedFileService {

    List<FileResponse> listByFolder(UUID folderId);

    /**
     * Fichiers à la racine d'un espace (sans dossier, V2). {@code projectId} null =
     * racine de l'espace Organisation, sinon racine de l'espace du projet.
     */
    List<FileResponse> listRootFiles(UUID projectId);

    /**
     * TOUS les fichiers d'un espace, à plat (racine + tous sous-dossiers).
     * {@code projectId} null = espace Organisation, sinon espace du projet.
     * Utilisé pour les suggestions de mention (récursion complète).
     */
    List<FileResponse> listAllFiles(UUID projectId);

    FileResponse addFile(CreateFileRequest request);

    FileResponse getFile(UUID fileId);

    FileResponse updateFile(UUID fileId, UpdateFileRequest request);

    void deleteFile(UUID fileId);

    // ─── Vues transverses ───
    List<FileResponse> myDocuments();

    List<FileResponse> trash();

    FileResponse restore(UUID fileId);

    /** CU-M17 : suppression définitive d'un seul élément de sa propre corbeille. */
    void purge(UUID fileId);

    void emptyTrash();
}
