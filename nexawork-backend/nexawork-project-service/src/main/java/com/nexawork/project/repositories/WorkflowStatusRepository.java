package com.nexawork.project.repositories;

import com.nexawork.project.entities.WorkflowStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WorkflowStatusRepository extends JpaRepository<WorkflowStatus, UUID> {

    List<WorkflowStatus> findByProjectIdOrderByPositionAsc(UUID projectId);
}
