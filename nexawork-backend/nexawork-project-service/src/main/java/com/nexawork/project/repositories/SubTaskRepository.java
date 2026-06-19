package com.nexawork.project.repositories;

import com.nexawork.project.entities.SubTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubTaskRepository extends JpaRepository<SubTask, Long> {
    List<SubTask> findByTaskId(Long taskId);
    List<SubTask> findByTaskIdAndIsCompleted(Long taskId, Boolean isCompleted);
}
