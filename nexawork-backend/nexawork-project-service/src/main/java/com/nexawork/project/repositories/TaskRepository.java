package com.nexawork.project.repositories;

import com.nexawork.project.entities.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    List<Task> findByProjectId(UUID projectId);
}
