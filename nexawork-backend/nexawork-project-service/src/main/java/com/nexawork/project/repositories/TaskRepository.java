package com.nexawork.project.repositories;

import com.nexawork.project.entities.Task;
import com.nexawork.project.entities.enums.ProjectStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    List<Task> findByProjectId(UUID projectId);

    /** Au moins une tâche est positionnée sur ce statut (garde la suppression d'une colonne non vide). */
    boolean existsByStatusId(UUID statusId);

    /**
     * Toutes les tâches des projets d'un workspace dans un statut de cycle de vie
     * donné, avec projet et statut Kanban joints (agrégats du tableau de bord).
     */
    @Query("""
            SELECT t FROM Task t
            JOIN FETCH t.project p
            LEFT JOIN FETCH t.status s
            WHERE p.organisationId = :orgId AND p.status = :projectStatus
            """)
    List<Task> findAllInProjects(@Param("orgId") UUID orgId,
                                 @Param("projectStatus") ProjectStatus projectStatus);

    /**
     * Tâches assignées à un utilisateur dans les projets actifs d'un workspace
     * (vue « Mes tâches », §5.1). Triées par échéance : les tâches sans date
     * passent en dernier.
     */
    @Query("""
            SELECT t FROM Task t
            JOIN FETCH t.project p
            LEFT JOIN FETCH t.status s
            WHERE p.organisationId = :orgId AND p.status = :projectStatus
              AND t.assigneeType = com.nexawork.project.entities.enums.AssigneeType.USER
              AND t.assigneeId = :userId
            ORDER BY CASE WHEN t.dueDate IS NULL THEN 1 ELSE 0 END, t.dueDate ASC
            """)
    List<Task> findAssignedTo(@Param("orgId") UUID orgId,
                              @Param("userId") UUID userId,
                              @Param("projectStatus") ProjectStatus projectStatus);

    /**
     * Recherche globale (§4.8) : tâches dont le titre, la clé ou la description
     * contient le terme (insensible à la casse), dans les projets actifs
     * **visibles par l'appelant** (R15 : admin, ou membre du projet).
     */
    @Query("""
            SELECT t FROM Task t
            JOIN FETCH t.project p
            LEFT JOIN FETCH t.status s
            WHERE p.organisationId = :orgId AND p.status = :projectStatus
              AND (:isAdmin = TRUE
                   OR EXISTS (SELECT 1 FROM ProjectMember m
                              WHERE m.project = p AND m.userId = :userId))
              AND (LOWER(t.title) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(t.taskKey) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(t.description, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY t.createdDate DESC
            """)
    List<Task> search(@Param("orgId") UUID orgId,
                      @Param("q") String q,
                      @Param("projectStatus") ProjectStatus projectStatus,
                      @Param("userId") UUID userId,
                      @Param("isAdmin") boolean isAdmin,
                      Pageable pageable);
}
