package com.nexawork.project.repositories;

import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.enums.ProjectStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

    List<Project> findByOrganisationId(UUID organisationId);

    List<Project> findByOrganisationIdAndStatus(UUID organisationId, ProjectStatus status);

    /** Unicité du préfixe par workspace (génération / changement de prefix). */
    boolean existsByOrganisationIdAndPrefix(UUID organisationId, String prefix);

    /** Lecture verrouillée (PESSIMISTIC_WRITE) pour incrémenter task_sequence sans course. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Project p WHERE p.id = :id")
    Optional<Project> findByIdForUpdate(@Param("id") UUID id);

    /**
     * Projets d'un workspace filtrés par statut, visibles par l'appelant :
     * tous si administrateur/propriétaire, sinon seulement ceux dont il est
     * membre (R15). Une seule requête pour les deux cas.
     */
    @Query("""
            SELECT p FROM Project p
            WHERE p.organisationId = :orgId
              AND p.status = :status
              AND (:isAdmin = TRUE
                   OR EXISTS (SELECT 1 FROM ProjectMember m
                              WHERE m.project = p AND m.userId = :userId))
            ORDER BY p.createdDate DESC
            """)
    List<Project> findVisible(@Param("orgId") UUID orgId,
                              @Param("status") ProjectStatus status,
                              @Param("userId") UUID userId,
                              @Param("isAdmin") boolean isAdmin);
}
