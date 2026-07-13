package com.nexawork.ged.repositories;

import com.nexawork.ged.entities.GedFolder;
import com.nexawork.ged.entities.enums.FolderType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /** Corbeille (R11) : dossiers supprimés par l'appelant. */
    List<GedFolder> findByCreatedByUserIdAndIsDeletedTrue(UUID createdByUserId);

    /** Idempotence du seeding project.created : dossier racine par type. */
    Optional<GedFolder> findByProjectIdAndFolderTypeAndParentIdIsNull(UUID projectId, FolderType folderType);

    boolean existsByProjectIdAndFolderTypeAndParentIdIsNull(UUID projectId, FolderType folderType);

    /**
     * Recherche globale (§4.8) : dossiers non supprimés du workspace dont le nom
     * contient le terme. La visibilité (REF G) est appliquée en aval par
     * {@code AccessEvaluator}.
     */
    @Query("""
            SELECT d FROM GedFolder d
            WHERE d.organisationId = :orgId
              AND d.isDeleted = FALSE
              AND LOWER(d.name) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY d.createdAt DESC
            """)
    List<GedFolder> search(@Param("orgId") UUID orgId, @Param("q") String q, Pageable pageable);
}
