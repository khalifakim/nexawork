package com.nexawork.project.repositories;

import com.nexawork.project.entities.TaskAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskAttachmentRepository extends JpaRepository<TaskAttachment, UUID> {

    List<TaskAttachment> findByTaskId(UUID taskId);

    List<TaskAttachment> findByTaskProjectId(UUID projectId);
}
