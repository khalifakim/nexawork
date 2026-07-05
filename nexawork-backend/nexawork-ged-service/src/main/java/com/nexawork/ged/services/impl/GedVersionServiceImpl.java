package com.nexawork.ged.services.impl;

import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.ged.dtos.requests.CreateVersionRequest;
import com.nexawork.ged.dtos.responses.VersionResponse;
import com.nexawork.ged.entities.GedFile;
import com.nexawork.ged.entities.GedFileVersion;
import com.nexawork.ged.entities.enums.TargetType;
import com.nexawork.ged.mappers.VersionMapper;
import com.nexawork.ged.repositories.GedFileRepository;
import com.nexawork.ged.repositories.GedFileVersionRepository;
import com.nexawork.ged.security.CallerContext;
import com.nexawork.ged.services.AccessEvaluator;
import com.nexawork.ged.services.GedGuard;
import com.nexawork.ged.services.GedVersionService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Versions d'un fichier GED (§11.5). Historique append-only : la « version
 * actuelle » est celle de plus grand numéro, et le pointeur du GedFile
 * (fileUrl / sourceFileId / fileSize) est tenu à jour dessus.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GedVersionServiceImpl implements GedVersionService {

    GedFileRepository fileRepository;
    GedFileVersionRepository versionRepository;
    VersionMapper versionMapper;
    AccessEvaluator access;
    GedGuard guard;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<VersionResponse> listVersions(UUID fileId) {
        GedFile file = guard.loadFileInOrg(fileId);
        access.requireViewable(file);

        List<GedFileVersion> versions = versionRepository.findByGedFileIdOrderByVersionNumberDesc(fileId);
        if (versions.isEmpty()) {
            // Aucune version enregistrée : la version courante est le fichier lui-même (v1 synthétique).
            return List.of(syntheticCurrent(file));
        }
        int maxNumber = versions.get(0).getVersionNumber();
        return versions.stream().map(v -> toDto(v, v.getVersionNumber() == maxNumber)).toList();
    }

    @Override
    public VersionResponse addVersion(UUID fileId, CreateVersionRequest request) {
        GedFile file = guard.loadFileInOrg(fileId);
        access.requireEditable(file.getAddedByUserId(), TargetType.FILE, fileId, "ajouter une version");

        ensureBaseline(file);
        int next = nextNumber(fileId);

        GedFileVersion version = versionRepository.save(GedFileVersion.builder()
                .gedFile(file)
                .versionNumber(next)
                .sourceFileId(request.getSourceFileId())
                .fileUrl(request.getFileUrl())
                .fileSize(request.getFileSize())
                .note(request.getNote())
                .uploadedBy(caller.userId())
                .build());

        pointFileTo(file, version);
        return toDto(version, true);
    }

    @Override
    public VersionResponse restoreVersion(UUID fileId, UUID versionId) {
        GedFile file = guard.loadFileInOrg(fileId);
        access.requireEditable(file.getAddedByUserId(), TargetType.FILE, fileId, "restaurer une version");

        GedFileVersion chosen = versionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Version introuvable."));
        if (!chosen.getGedFile().getId().equals(fileId)) {
            throw new ResourceNotFoundException("Version introuvable pour ce fichier.");
        }

        ensureBaseline(file);
        // La restauration crée une NOUVELLE version (clone) qui devient l'actuelle.
        int next = nextNumber(fileId);
        GedFileVersion restored = versionRepository.save(GedFileVersion.builder()
                .gedFile(file)
                .versionNumber(next)
                .sourceFileId(chosen.getSourceFileId())
                .fileUrl(chosen.getFileUrl())
                .fileSize(chosen.getFileSize())
                .note("Restauration de la version " + chosen.getVersionNumber())
                .uploadedBy(caller.userId())
                .build());

        pointFileTo(file, restored);
        return toDto(restored, true);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /** Matérialise la version 1 depuis l'état courant du fichier si aucune n'existe. */
    private void ensureBaseline(GedFile file) {
        if (versionRepository.findByGedFileIdOrderByVersionNumberDesc(file.getId()).isEmpty()) {
            versionRepository.save(GedFileVersion.builder()
                    .gedFile(file)
                    .versionNumber(1)
                    .sourceFileId(file.getSourceFileId() != null ? file.getSourceFileId() : file.getId())
                    .fileUrl(file.getFileUrl())
                    .fileSize(file.getFileSize())
                    .note("Version initiale")
                    .uploadedBy(file.getAddedByUserId())
                    .build());
        }
    }

    private int nextNumber(UUID fileId) {
        return versionRepository.findTopByGedFileIdOrderByVersionNumberDesc(fileId)
                .map(v -> v.getVersionNumber() + 1)
                .orElse(1);
    }

    private void pointFileTo(GedFile file, GedFileVersion version) {
        file.setFileUrl(version.getFileUrl());
        file.setFileSize(version.getFileSize());
        file.setSourceFileId(version.getSourceFileId());
        fileRepository.save(file);
    }

    private VersionResponse toDto(GedFileVersion v, boolean current) {
        VersionResponse dto = versionMapper.asDto(v);
        dto.setCurrent(current);
        return dto;
    }

    private VersionResponse syntheticCurrent(GedFile file) {
        return VersionResponse.builder()
                .id(null)
                .gedFileId(file.getId())
                .versionNumber(1)
                .sourceFileId(file.getSourceFileId())
                .fileUrl(file.getFileUrl())
                .fileSize(file.getFileSize())
                .note("Version initiale")
                .uploadedBy(file.getAddedByUserId())
                .createdAt(file.getAddedAt())
                .current(true)
                .build();
    }
}
