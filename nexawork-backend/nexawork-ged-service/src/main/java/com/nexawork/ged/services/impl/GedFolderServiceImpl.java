package com.nexawork.ged.services.impl;

import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.ged.dtos.requests.CreateFolderRequest;
import com.nexawork.ged.dtos.requests.UpdateFolderRequest;
import com.nexawork.ged.dtos.responses.FolderContentResponse;
import com.nexawork.ged.dtos.responses.FolderResponse;
import com.nexawork.ged.entities.GedFolder;
import com.nexawork.ged.entities.enums.AccessMode;
import com.nexawork.ged.entities.enums.FolderType;
import com.nexawork.ged.mappers.FileMapper;
import com.nexawork.ged.mappers.FolderMapper;
import com.nexawork.ged.repositories.GedFileRepository;
import com.nexawork.ged.repositories.GedFolderRepository;
import com.nexawork.ged.security.CallerContext;
import com.nexawork.ged.services.AccessEvaluator;
import com.nexawork.ged.services.GedFolderService;
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
 * Dossiers GED (§13.4). REF G (404), R12 (suppression), rejets dossier système.
 * Le contenu virtuel de TASK_ATTACHMENTS est délégué au Lot 6D (ici : liste vide
 * + drapeau, le contenu réel sera injecté par le service dédié).
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GedFolderServiceImpl implements GedFolderService {

    GedFolderRepository folderRepository;
    GedFileRepository fileRepository;
    FolderMapper folderMapper;
    FileMapper fileMapper;
    AccessEvaluator access;
    GedGuard guard;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<FolderResponse> listRootFolders(UUID projectId) {
        UUID org = caller.organisationId();
        List<GedFolder> roots = projectId != null
                ? folderRepository.findByOrganisationIdAndProjectIdAndParentIdIsNullAndIsDeletedFalse(org, projectId)
                : folderRepository.findByOrganisationIdAndProjectIdIsNullAndParentIdIsNullAndIsDeletedFalse(org);
        return roots.stream().filter(access::canView).map(folderMapper::asDto).toList();
    }

    @Override
    public FolderResponse createFolder(CreateFolderRequest request) {
        UUID org = caller.organisationId();
        UUID projectId = request.getProjectId();

        if (request.getParentId() != null) {
            GedFolder parent = guard.loadFolderInOrg(request.getParentId());
            guard.rejectIfSystemFolder(parent, "créer un sous-dossier");
            access.requireViewable(parent);
            // Le sous-dossier hérite du scope projet du parent.
            projectId = parent.getProjectId();
        }

        GedFolder folder = folderRepository.save(GedFolder.builder()
                .name(request.getName())
                .parentId(request.getParentId())
                .organisationId(org)
                .projectId(projectId)
                .folderType(FolderType.USER)
                .accessMode(request.getAccessMode() != null ? request.getAccessMode() : AccessMode.OPEN)
                .createdByUserId(caller.userId())
                .isDeleted(false)
                .build());
        return folderMapper.asDto(folder);
    }

    @Override
    @Transactional(readOnly = true)
    public FolderContentResponse getContent(UUID folderId) {
        GedFolder folder = guard.loadFolderInOrg(folderId);
        access.requireViewable(folder);

        FolderContentResponse.FolderContentResponseBuilder builder = FolderContentResponse.builder()
                .folder(folderMapper.asDto(folder));

        if (folder.getFolderType() == FolderType.TASK_ATTACHMENTS) {
            // Contenu virtuel calculé par appel synchrone au Project Service (Lot 6D).
            // Ici : sous-dossiers/fichiers vides (aucun stocké en base pour ce type).
            return builder.subFolders(List.of()).files(List.of()).taskAttachments(List.of()).build();
        }

        List<FolderResponse> subFolders = folderRepository.findByParentIdAndIsDeletedFalse(folderId).stream()
                .filter(access::canView).map(folderMapper::asDto).toList();
        List<com.nexawork.ged.dtos.responses.FileResponse> files =
                fileRepository.findByFolderIdAndIsDeletedFalse(folderId).stream()
                        .filter(access::canView).map(fileMapper::asDto).toList();
        return builder.subFolders(subFolders).files(files).build();
    }

    @Override
    public FolderResponse updateFolder(UUID folderId, UpdateFolderRequest request) {
        GedFolder folder = guard.loadFolderInOrg(folderId);
        guard.rejectIfSystemFolder(folder, "renommer ou déplacer");
        access.requireEditable(folder.getCreatedByUserId(),
                com.nexawork.ged.entities.enums.TargetType.FOLDER, folderId, "modifier le dossier");

        if (request.getName() != null && !request.getName().isBlank()) {
            folder.setName(request.getName());
        }
        if (Boolean.TRUE.equals(request.getMoveToRoot())) {
            folder.setParentId(null);
        } else if (request.getParentId() != null) {
            if (request.getParentId().equals(folderId)) {
                throw new InvalidRequestException("Un dossier ne peut pas être son propre parent.");
            }
            GedFolder newParent = guard.loadFolderInOrg(request.getParentId());
            guard.rejectIfSystemFolder(newParent, "déplacer vers ce dossier");
            folder.setParentId(newParent.getId());
        }
        return folderMapper.asDto(folderRepository.save(folder));
    }

    @Override
    public void deleteFolder(UUID folderId) {
        GedFolder folder = guard.loadFolderInOrg(folderId);
        guard.rejectIfSystemFolder(folder, "supprimer");
        access.requireDeletable(folder.getCreatedByUserId()); // R12

        // Soft-delete du dossier (les fichiers restent liés ; la vue les masque via le parent).
        folder.setIsDeleted(true);
        folder.setDeletedAt(LocalDateTime.now());
        folderRepository.save(folder);
        log.info("Dossier {} mis en corbeille par {}", folderId, caller.userId());
    }
}
