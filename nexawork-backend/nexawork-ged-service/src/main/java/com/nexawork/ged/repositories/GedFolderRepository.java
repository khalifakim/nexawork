package com.nexawork.ged.repositories;

import com.nexawork.ged.entities.GedFolder;
import com.nexawork.ged.entities.enums.FolderType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GedFolderRepository extends JpaRepository<GedFolder, UUID> {

    List<GedFolder> findByParentIdAndIsDeletedFalse(UUID parentId);

    /** Racines d'un scope (organisation seule ou projet). */
    List<GedFolder> findByOrganisationIdAndProjectIdAndParentIdIsNullAndIsDeletedFalse(
            UUID organisationId, UUID projectId);

    List<GedFolder> findByOrganisationIdAndProjectIdIsNullAndParentIdIsNullAndIsDeletedFalse(
            UUID organisationId);

    /** Idempotence du seeding project.created : dossier racine par type. */
    Optional<GedFolder> findByProjectIdAndFolderTypeAndParentIdIsNull(UUID projectId, FolderType folderType);

    boolean existsByProjectIdAndFolderTypeAndParentIdIsNull(UUID projectId, FolderType folderType);
}
