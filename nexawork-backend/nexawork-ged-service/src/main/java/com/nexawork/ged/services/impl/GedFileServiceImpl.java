package com.nexawork.ged.services.impl;

import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.ged.dtos.requests.CreateFileRequest;
import com.nexawork.ged.dtos.requests.UpdateFileRequest;
import com.nexawork.ged.dtos.responses.FileResponse;
import com.nexawork.ged.entities.GedFile;
import com.nexawork.ged.entities.GedFolder;
import com.nexawork.ged.entities.enums.AccessMode;
import com.nexawork.ged.entities.enums.TargetType;
import com.nexawork.ged.mappers.FileMapper;
import com.nexawork.ged.repositories.GedFileRepository;
import com.nexawork.ged.security.CallerContext;
import com.nexawork.ged.services.AccessEvaluator;
import com.nexawork.ged.services.GedFileService;
import com.nexawork.ged.services.GedGuard;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Fichiers GED (§13.4). REF G (404), R12 (suppression), R11 (corbeille par
 * utilisateur), rejet d'ajout dans le dossier système.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GedFileServiceImpl implements GedFileService {

    GedFileRepository fileRepository;
    FileMapper fileMapper;
    AccessEvaluator access;
    GedGuard guard;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<FileResponse> listByFolder(UUID folderId) {
        GedFolder folder = guard.loadFolderInOrg(folderId);
        access.requireViewable(folder);
        return fileRepository.findByFolderIdAndIsDeletedFalse(folderId).stream()
                .filter(access::canView).map(fileMapper::asDto).toList();
    }

    @Override
    public FileResponse addFile(CreateFileRequest request) {
        GedFolder folder = guard.loadFolderInOrg(request.getFolderId());
        guard.rejectIfSystemFolder(folder, "importer un fichier"); // §13.4
        access.requireViewable(folder);

        GedFile file = fileRepository.save(GedFile.builder()
                .folder(folder)
                .name(request.getName())
                .fileUrl(request.getFileUrl())
                .fileSize(request.getFileSize())
                .contentType(request.getContentType())
                .sourceFileId(request.getSourceFileId())
                .projectId(folder.getProjectId())
                .accessMode(request.getAccessMode() != null ? request.getAccessMode() : AccessMode.OPEN)
                .addedByUserId(caller.userId())
                .isDeleted(false)
                .build());
        return fileMapper.asDto(file);
    }

    @Override
    @Transactional(readOnly = true)
    public FileResponse getFile(UUID fileId) {
        GedFile file = guard.loadFileInOrg(fileId);
        access.requireViewable(file);
        return fileMapper.asDto(file);
    }

    @Override
    public FileResponse updateFile(UUID fileId, UpdateFileRequest request) {
        GedFile file = guard.loadFileInOrg(fileId);
        access.requireEditable(file.getAddedByUserId(), TargetType.FILE, fileId, "modifier le fichier");

        if (request.getName() != null && !request.getName().isBlank()) {
            file.setName(request.getName());
        }
        return fileMapper.asDto(fileRepository.save(file));
    }

    @Override
    public void deleteFile(UUID fileId) {
        GedFile file = guard.loadFileInOrg(fileId);
        access.requireDeletable(file.getAddedByUserId()); // R12
        file.setIsDeleted(true);
        file.setDeletedAt(LocalDateTime.now());
        fileRepository.save(file);
        log.info("Fichier {} mis en corbeille par {}", fileId, caller.userId());
    }

    // ─── Vues transverses ───────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<FileResponse> myDocuments() {
        // « Mes documents » — tout ce que l'utilisateur a déposé (§11.1), non supprimé.
        return fileRepository.findByAddedByUserIdAndIsDeletedFalse(caller.userId()).stream()
                .map(fileMapper::asDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<FileResponse> trash() {
        // R11 : corbeille filtrée par utilisateur (chacun ne voit que ses éléments).
        return fileRepository.findByAddedByUserIdAndIsDeletedTrue(caller.userId()).stream()
                .map(fileMapper::asDto).toList();
    }

    @Override
    public FileResponse restore(UUID fileId) {
        GedFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("Fichier introuvable."));
        // R11 : la corbeille est strictement personnelle — on ne restaure que ses
        // propres éléments (aucune dérogation administrateur : cf. retrait de CU-A10).
        if (!file.getAddedByUserId().equals(caller.userId())) {
            throw new ResourceNotFoundException("Fichier introuvable.");
        }
        file.setIsDeleted(false);
        file.setDeletedAt(null);
        return fileMapper.asDto(fileRepository.save(file));
    }

    @Override
    public void purge(UUID fileId) {
        // CU-M17 : suppression définitive d'un élément de sa propre corbeille.
        GedFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("Fichier introuvable."));
        // R11 : la corbeille est strictement personnelle — on ne purge que ses
        // propres éléments ; un élément hors corbeille n'est pas un élément de corbeille.
        if (!Boolean.TRUE.equals(file.getIsDeleted())
                || !file.getAddedByUserId().equals(caller.userId())) {
            throw new ResourceNotFoundException("Fichier introuvable.");
        }
        fileRepository.delete(file);
        log.info("Élément purgé de la corbeille par {} ({})", caller.userId(), fileId);
    }

    @Override
    public void emptyTrash() {
        // Vide définitivement la corbeille de l'appelant (§13.4 : hard delete).
        List<GedFile> deleted = fileRepository.findByAddedByUserIdAndIsDeletedTrue(caller.userId());
        fileRepository.deleteAll(deleted);
        log.info("Corbeille vidée par {} ({} fichiers)", caller.userId(), deleted.size());
    }
}
