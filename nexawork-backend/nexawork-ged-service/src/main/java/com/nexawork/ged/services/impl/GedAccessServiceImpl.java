package com.nexawork.ged.services.impl;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.ged.dtos.requests.ChangeAccessModeRequest;
import com.nexawork.ged.dtos.requests.CreateGrantRequest;
import com.nexawork.ged.dtos.responses.FileResponse;
import com.nexawork.ged.dtos.responses.GrantResponse;
import com.nexawork.ged.entities.GedAccessGrant;
import com.nexawork.ged.entities.GedFile;
import com.nexawork.ged.entities.GedFolder;
import com.nexawork.ged.entities.enums.AccessMode;
import com.nexawork.ged.entities.enums.GranteeType;
import com.nexawork.ged.entities.enums.TargetType;
import com.nexawork.ged.mappers.FileMapper;
import com.nexawork.ged.mappers.GrantMapper;
import com.nexawork.ged.repositories.GedAccessGrantRepository;
import com.nexawork.ged.repositories.GedFileRepository;
import com.nexawork.ged.repositories.GedFolderRepository;
import com.nexawork.ged.security.CallerContext;
import com.nexawork.ged.services.GedAccessService;
import com.nexawork.ged.services.GedGuard;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Gestion des accès GED (§11.6/§11.7). Grants Lecteur/Éditeur, R13 (propriétaire
 * verrouillé), R16 best-effort, changement de mode, « Partagé avec moi ».
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GedAccessServiceImpl implements GedAccessService {

    GedFolderRepository folderRepository;
    GedFileRepository fileRepository;
    GedAccessGrantRepository grantRepository;
    com.nexawork.ged.services.AccessEvaluator access;
    FileMapper fileMapper;
    GrantMapper grantMapper;
    GedGuard guard;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<GrantResponse> listGrants(String targetTypeRaw, UUID targetId) {
        TargetType targetType = parseTargetType(targetTypeRaw);
        Target target = resolveTarget(targetType, targetId);
        // Gérer les accès = propriétaire, ADMIN/OWNER ou éditeur (§11.6.c).
        access.requireEditable(target.creatorId(), targetType, targetId, "gérer les accès");

        List<GrantResponse> result = new ArrayList<>();
        // R13 : ligne propriétaire en premier, marquée non-retirable.
        result.add(GrantResponse.builder()
                .targetType(targetType).targetId(targetId)
                .granteeType(GranteeType.USER).granteeId(target.creatorId())
                .owner(true)
                .build());
        grantRepository.findByTargetTypeAndTargetId(targetType, targetId).stream()
                .map(grantMapper::asDto)
                .forEach(result::add);
        return result;
    }

    @Override
    public GrantResponse addGrant(CreateGrantRequest request) {
        Target target = resolveTarget(request.getTargetType(), request.getTargetId());
        rejectSystemTarget(target); // §13.4 : pas de grant sur le dossier système
        access.requireEditable(target.creatorId(), request.getTargetType(), request.getTargetId(), "gérer les accès");

        // R13 : le propriétaire ne peut pas figurer comme bénéficiaire (il a déjà tout).
        if (request.getGranteeType() == GranteeType.USER && request.getGranteeId().equals(target.creatorId())) {
            throw new InvalidRequestException("Le propriétaire ne peut pas être ajouté comme bénéficiaire.");
        }

        // Idempotence : met à jour le niveau si un grant existe déjà.
        GedAccessGrant grant = grantRepository.findByTargetTypeAndTargetId(request.getTargetType(), request.getTargetId())
                .stream()
                .filter(g -> g.getGranteeType() == request.getGranteeType()
                        && g.getGranteeId().equals(request.getGranteeId()))
                .findFirst()
                .orElseGet(() -> GedAccessGrant.builder()
                        .targetType(request.getTargetType())
                        .targetId(request.getTargetId())
                        .granteeType(request.getGranteeType())
                        .granteeId(request.getGranteeId())
                        .grantedBy(caller.userId())
                        .build());
        grant.setAccessLevel(request.getAccessLevel());
        grant = grantRepository.save(grant);

        // Un partage bascule la cible en mode SHARED.
        setMode(request.getTargetType(), request.getTargetId(), AccessMode.SHARED);
        return grantMapper.asDto(grant);
    }

    @Override
    public void revokeGrant(UUID grantId) {
        GedAccessGrant grant = grantRepository.findById(grantId)
                .orElseThrow(() -> new ResourceNotFoundException("Accès introuvable."));
        Target target = resolveTarget(grant.getTargetType(), grant.getTargetId());
        rejectSystemTarget(target);
        access.requireEditable(target.creatorId(), grant.getTargetType(), grant.getTargetId(), "gérer les accès");
        // R13 : le propriétaire n'a pas de grant en base → non retirable par construction.
        grantRepository.delete(grant);
    }

    @Override
    public void changeFolderAccessMode(UUID folderId, ChangeAccessModeRequest request) {
        GedFolder folder = guard.loadFolderInOrg(folderId);
        guard.rejectIfSystemFolder(folder, "modifier les accès");
        access.requireEditable(folder.getCreatedByUserId(), TargetType.FOLDER, folderId, "gérer les accès");
        applyModeChange(TargetType.FOLDER, folderId, request.getAccessMode(),
                m -> { folder.setAccessMode(m); folderRepository.save(folder); });
    }

    @Override
    public void changeFileAccessMode(UUID fileId, ChangeAccessModeRequest request) {
        GedFile file = guard.loadFileInOrg(fileId);
        access.requireEditable(file.getAddedByUserId(), TargetType.FILE, fileId, "gérer les accès");
        applyModeChange(TargetType.FILE, fileId, request.getAccessMode(),
                m -> { file.setAccessMode(m); fileRepository.save(file); });
    }

    @Override
    @Transactional(readOnly = true)
    public List<FileResponse> sharedWithMe() {
        UUID me = caller.userId();
        // Grants USER dont je suis bénéficiaire, ciblant des fichiers.
        return grantRepository.findByGranteeIdIn(List.of(me)).stream()
                .filter(g -> g.getGranteeType() == GranteeType.USER && g.getTargetType() == TargetType.FILE)
                .map(g -> fileRepository.findById(g.getTargetId()).orElse(null))
                .filter(f -> f != null && !Boolean.TRUE.equals(f.getIsDeleted()))
                .filter(f -> f.getFolder().getOrganisationId().equals(caller.organisationId()))
                .distinct()
                .map(fileMapper::asDto)
                .toList();
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private void applyModeChange(TargetType type, UUID id, AccessMode mode, java.util.function.Consumer<AccessMode> setter) {
        setter.accept(mode);
        // Passage à OPEN ou PRIVATE : purge des grants (§11.6 « retire les restrictions »).
        if (mode == AccessMode.OPEN || mode == AccessMode.PRIVATE) {
            grantRepository.deleteByTargetTypeAndTargetId(type, id);
        }
    }

    private void setMode(TargetType type, UUID id, AccessMode mode) {
        if (type == TargetType.FOLDER) {
            folderRepository.findById(id).ifPresent(f -> { f.setAccessMode(mode); folderRepository.save(f); });
        } else {
            fileRepository.findById(id).ifPresent(f -> { f.setAccessMode(mode); fileRepository.save(f); });
        }
    }

    /** §13.4 : aucune restriction d'accès ne peut cibler le dossier système. */
    private void rejectSystemTarget(Target target) {
        if (target.isSystemFolder()) {
            throw new ForbiddenException(
                    "Le dossier système « Pièces jointes aux tâches » n'autorise pas la gestion des accès.");
        }
    }

    private TargetType parseTargetType(String raw) {
        try {
            return TargetType.valueOf(raw.toUpperCase());
        } catch (Exception e) {
            throw new InvalidRequestException("targetType invalide : « " + raw + " » (attendu FOLDER ou FILE).");
        }
    }

    /** Cible résolue (dossier ou fichier), bornée au workspace, avec son créateur. */
    private Target resolveTarget(TargetType type, UUID id) {
        if (type == TargetType.FOLDER) {
            GedFolder folder = guard.loadFolderInOrg(id);
            return new Target(folder.getCreatedByUserId(), folder, null);
        }
        GedFile file = guard.loadFileInOrg(id);
        return new Target(file.getAddedByUserId(), null, file);
    }

    /** Cible générique pour la gestion d'accès. */
    public record Target(UUID creatorId, GedFolder folder, GedFile file) {
        public boolean isSystemFolder() {
            return folder != null
                    && folder.getFolderType() == com.nexawork.ged.entities.enums.FolderType.TASK_ATTACHMENTS;
        }
    }
}
