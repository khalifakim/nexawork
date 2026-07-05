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

    FileResponse addFile(CreateFileRequest request);

    FileResponse getFile(UUID fileId);

    FileResponse updateFile(UUID fileId, UpdateFileRequest request);

    void deleteFile(UUID fileId);

    // ─── Vues transverses ───
    List<FileResponse> myDocuments();

    List<FileResponse> trash();

    FileResponse restore(UUID fileId);

    void emptyTrash();
}
