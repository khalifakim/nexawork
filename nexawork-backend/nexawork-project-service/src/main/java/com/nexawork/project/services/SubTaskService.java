package com.nexawork.project.services;

import com.nexawork.project.dtos.requests.CreateSubTaskRequest;
import com.nexawork.project.dtos.requests.UpdateSubTaskRequest;
import com.nexawork.project.dtos.responses.SubTaskResponse;

import java.util.List;
import java.util.UUID;

/**
 * Sous-tâches d'une tâche (§13.2). Réservées aux membres du projet (R15) ;
 * refusées si projet archivé (REF E).
 */
public interface SubTaskService {

    List<SubTaskResponse> listSubTasks(UUID taskId);

    SubTaskResponse addSubTask(UUID taskId, CreateSubTaskRequest request);

    SubTaskResponse updateSubTask(UUID taskId, UUID subTaskId, UpdateSubTaskRequest request);

    void deleteSubTask(UUID taskId, UUID subTaskId);
}
