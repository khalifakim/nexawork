package com.nexawork.ged.services;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.ged.entities.GedFile;
import com.nexawork.ged.entities.GedFolder;
import com.nexawork.ged.entities.enums.FolderType;
import com.nexawork.ged.repositories.GedFileRepository;
import com.nexawork.ged.repositories.GedFolderRepository;
import com.nexawork.ged.security.CallerContext;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Garde-fou transverse du GED : chargement borné au workspace (404 hors org) et
 * protection du dossier système « Pièces jointes aux tâches » (§13.4 règle
 * transverse : toute mutation ciblant ce dossier ou ses lignes → 403).
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GedGuard {

    GedFolderRepository folderRepository;
    GedFileRepository fileRepository;
    CallerContext caller;

    /** Charge un dossier borné au workspace de l'appelant (404 sinon). */
    public GedFolder loadFolderInOrg(UUID folderId) {
        GedFolder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("Dossier introuvable."));
        if (!folder.getOrganisationId().equals(caller.organisationId()) || Boolean.TRUE.equals(folder.getIsDeleted())) {
            throw new ResourceNotFoundException("Dossier introuvable.");
        }
        return folder;
    }

    /** Charge un fichier borné au workspace de l'appelant (404 sinon). */
    public GedFile loadFileInOrg(UUID fileId) {
        GedFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("Fichier introuvable."));
        // Le scope org est porté par le fichier lui-même (V2) — un fichier racine
        // n'a pas de dossier dont dériver l'organisation.
        if (!file.getOrganisationId().equals(caller.organisationId())
                || Boolean.TRUE.equals(file.getIsDeleted())) {
            throw new ResourceNotFoundException("Fichier introuvable.");
        }
        return file;
    }

    /**
     * Rejette (403) toute mutation ciblant le dossier système TASK_ATTACHMENTS ou
     * l'un de ses éléments (§13.4 règle transverse), quel que soit le rôle.
     */
    public void rejectIfSystemFolder(GedFolder folder, String action) {
        if (folder.getFolderType() == FolderType.TASK_ATTACHMENTS) {
            throw new ForbiddenException(
                    "Le dossier système « Pièces jointes aux tâches » n'autorise pas cette action : " + action
                    + ". Rendez-vous sur la tâche associée.");
        }
    }
}
