package com.nexawork.ged.repositories;

import com.nexawork.ged.entities.GedFile;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface GedFileRepository extends JpaRepository<GedFile, UUID> {

    List<GedFile> findByFolderIdAndIsDeletedFalse(UUID folderId);

    long countByFolderIdAndIsDeletedFalse(UUID folderId);

    List<GedFile> findByAddedByUserIdAndIsDeletedFalse(UUID userId);

    List<GedFile> findByAddedByUserIdAndIsDeletedTrue(UUID userId);

    /**
     * Recherche globale (§4.8) : fichiers non supprimés du workspace dont le nom
     * contient le terme. L'organisation est portée par le dossier parent. La
     * visibilité (REF G) est appliquée en aval par {@code AccessEvaluator}.
     */
    @Query("""
            SELECT f FROM GedFile f
            JOIN FETCH f.folder d
            WHERE d.organisationId = :orgId
              AND f.isDeleted = FALSE
              AND LOWER(f.name) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY f.addedAt DESC
            """)
    List<GedFile> search(@Param("orgId") UUID orgId, @Param("q") String q, Pageable pageable);
}
