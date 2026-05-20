package com.nexawork.project.repositories;

import com.nexawork.project.entities.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByProjectId(Long projectId);
    List<Task> findByProjectIdAndStatusId(Long projectId, Long statusId);
    List<Task> findByAssigneeUserId(Long userId);
}
