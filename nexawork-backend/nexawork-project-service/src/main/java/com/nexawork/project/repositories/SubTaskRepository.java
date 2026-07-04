package com.nexawork.project.repositories;

import com.nexawork.project.entities.SubTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SubTaskRepository extends JpaRepository<SubTask, UUID> {

    List<SubTask> findByTaskId(UUID taskId);
}
