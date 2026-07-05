package com.nexawork.project.repositories;

import com.nexawork.project.entities.TaskAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface TaskAttachmentRepository extends JpaRepository<TaskAttachment, UUID> {

    List<TaskAttachment> findByTaskId(UUID taskId);

    long countByTaskId(UUID taskId);

    /**
     * Toutes les pièces jointes des tâches d'un projet, avec la tâche jointe
     * (pour l'agrégat task-attachments consommé par le GED), sans dédoublonnage.
     */
    @Query("""
            SELECT a FROM TaskAttachment a
            JOIN FETCH a.task t
            WHERE t.project.id = :projectId
            ORDER BY a.uploadedAt DESC
            """)
    List<TaskAttachment> findAggregateByProjectId(UUID projectId);
}
