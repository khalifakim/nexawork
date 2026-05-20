package com.nexawork.project.repositories;

import com.nexawork.project.entities.WorkflowStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkflowStatusRepository extends JpaRepository<WorkflowStatus, Long> {
    List<WorkflowStatus> findByProjectIdOrderByPosition(Long projectId);
}
