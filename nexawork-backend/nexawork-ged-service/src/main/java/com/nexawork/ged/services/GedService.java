package com.nexawork.ged.services;

import com.nexawork.ged.dtos.requests.AddFileVersionRequest;
import com.nexawork.ged.dtos.requests.CreateFolderRequest;
import com.nexawork.ged.dtos.requests.GrantAccessRequest;
import com.nexawork.ged.dtos.responses.*;
import com.nexawork.ged.entities.*;
import com.nexawork.ged.exceptions.ResourceNotFoundException;
import com.nexawork.ged.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GedService {

    private final GedFolderRepository folderRepo;
    private final GedFileRepository fileRepo;
    private final GedFileVersionRepository versionRepo;
    private final GedAccessGrantRepository grantRepo;

    @Transactional
    public GedFolderResponse createFolder(CreateFolderRequest request, Long organisationId, Long userId) {
        GedFolder folder = GedFolder.builder()
            .name(request.name())
            .parentId(request.parentId())
            .organisationId(organisationId)
            .projectId(request.projectId())
            .createdByUserId(userId)
            .build();
        folderRepo.save(folder);
        return toFolderResponse(folder);
    }

    @Transactional(readOnly = true)
    public List<GedFolderResponse> listRootFolders(Long organisationId) {
        return folderRepo.findByOrganisationIdAndParentIdIsNull(organisationId).stream()
            .map(this::toFolderResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<GedFolderResponse> listSubFolders(Long parentId) {
        return folderRepo.findByParentId(parentId).stream()
            .map(this::toFolderResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<GedFolderResponse> listByProject(Long projectId) {
        return folderRepo.findByProjectId(projectId).stream()
            .map(this::toFolderResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<GedFileResponse> listFiles(Long folderId) {
        return fileRepo.findByFolderId(folderId).stream()
            .map(this::toFileResponse).collect(Collectors.toList());
    }

    @Transactional
    public void deleteFolder(Long folderId) {
        GedFolder folder = folderRepo.findById(folderId)
            .orElseThrow(() -> new ResourceNotFoundException("Dossier introuvable : " + folderId));
        folder.setIsDeleted(true);
        folderRepo.save(folder);
    }

    @Transactional
    public void deleteFile(Long fileId) {
        GedFile file = fileRepo.findById(fileId)
            .orElseThrow(() -> new ResourceNotFoundException("Fichier introuvable : " + fileId));
        file.setIsDeleted(true);
        fileRepo.save(file);
    }

    // ── Versioning ────────────────────────────────────────────────────────────

    @Transactional
    public GedFileVersionResponse addVersion(Long fileId, AddFileVersionRequest request, Long uploadedBy) {
        GedFile file = fileRepo.findById(fileId)
            .orElseThrow(() -> new ResourceNotFoundException("Fichier GED introuvable : " + fileId));

        int nextVersion = versionRepo.countByGedFileId(fileId) + 1;

        GedFileVersion version = GedFileVersion.builder()
            .gedFile(file)
            .versionNumber(nextVersion)
            .sourceFileId(request.sourceFileId())
            .fileUrl(request.fileUrl())
            .fileSize(request.fileSize())
            .uploadedBy(uploadedBy)
            .build();
        versionRepo.save(version);

        file.setFileUrl(request.fileUrl());
        file.setSourceFileId(request.sourceFileId());
        if (request.fileSize() != null) file.setFileSize(request.fileSize());
        fileRepo.save(file);

        return toVersionResponse(version);
    }

    @Transactional(readOnly = true)
    public List<GedFileVersionResponse> listVersions(Long fileId) {
        return versionRepo.findByGedFileIdOrderByVersionNumberDesc(fileId).stream()
            .map(this::toVersionResponse).collect(Collectors.toList());
    }

    // ── Access grants ─────────────────────────────────────────────────────────

    @Transactional
    public GedAccessGrantResponse grantAccess(GrantAccessRequest request, Long grantedBy) {
        GedAccessGrant grant = GedAccessGrant.builder()
            .targetType(request.targetType())
            .targetId(request.targetId())
            .granteeType(request.granteeType())
            .granteeId(request.granteeId())
            .accessLevel(request.accessLevel())
            .grantedBy(grantedBy)
            .build();
        grantRepo.save(grant);
        return toGrantResponse(grant);
    }

    @Transactional(readOnly = true)
    public List<GedAccessGrantResponse> listGrantsForTarget(String targetType, Long targetId) {
        return grantRepo.findByTargetTypeAndTargetId(targetType, targetId).stream()
            .map(this::toGrantResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<GedAccessGrantResponse> listGrantsForGrantee(String granteeType, Long granteeId) {
        return grantRepo.findByGranteeTypeAndGranteeId(granteeType, granteeId).stream()
            .map(this::toGrantResponse).collect(Collectors.toList());
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private GedFolderResponse toFolderResponse(GedFolder f) {
        return new GedFolderResponse(
            f.getId(), f.getName(), f.getParentId(), f.getOrganisationId(),
            f.getProjectId(), f.getCreatedByUserId(), f.getCreatedAt());
    }

    private GedFileResponse toFileResponse(GedFile f) {
        return new GedFileResponse(
            f.getId(), f.getFolder().getId(), f.getName(), f.getFileUrl(),
            f.getFileSize(), f.getContentType(), f.getTaskId(),
            f.getProjectId(), f.getAddedByUserId(), f.getAddedAt());
    }

    private GedFileVersionResponse toVersionResponse(GedFileVersion v) {
        return new GedFileVersionResponse(
            v.getId(), v.getGedFile().getId(), v.getVersionNumber(),
            v.getSourceFileId(), v.getFileUrl(), v.getFileSize(),
            v.getUploadedBy(), v.getCreatedAt());
    }

    private GedAccessGrantResponse toGrantResponse(GedAccessGrant g) {
        return new GedAccessGrantResponse(
            g.getId(), g.getTargetType(), g.getTargetId(),
            g.getGranteeType(), g.getGranteeId(), g.getAccessLevel(),
            g.getGrantedBy(), g.getCreatedAt());
    }
}
