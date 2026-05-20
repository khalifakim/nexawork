package com.nexawork.ged.services;

import com.nexawork.ged.dtos.requests.CreateFolderRequest;
import com.nexawork.ged.dtos.responses.GedFileResponse;
import com.nexawork.ged.dtos.responses.GedFolderResponse;
import com.nexawork.ged.entities.GedFolder;
import com.nexawork.ged.exceptions.ResourceNotFoundException;
import com.nexawork.ged.repositories.GedFileRepository;
import com.nexawork.ged.repositories.GedFolderRepository;
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
        folderRepo.delete(folder);
    }

    private GedFolderResponse toFolderResponse(GedFolder f) {
        return new GedFolderResponse(
            f.getId(), f.getName(), f.getParentId(), f.getOrganisationId(),
            f.getProjectId(), f.getCreatedByUserId(), f.getCreatedAt());
    }

    private GedFileResponse toFileResponse(com.nexawork.ged.entities.GedFile f) {
        return new GedFileResponse(
            f.getId(), f.getFolder().getId(), f.getName(), f.getFileUrl(),
            f.getFileSize(), f.getContentType(), f.getTaskId(),
            f.getProjectId(), f.getAddedByUserId(), f.getAddedAt());
    }
}
