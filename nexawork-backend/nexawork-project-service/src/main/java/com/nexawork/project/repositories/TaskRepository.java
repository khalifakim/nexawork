package com.nexawork.project.repositories;

import com.nexawork.project.entities.Task;
import com.nexawork.project.entities.enums.ProjectStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    List<Task> findByProjectId(UUID projectId);

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
}
