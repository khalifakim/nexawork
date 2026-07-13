package com.nexawork.project.services;

import com.nexawork.project.dtos.requests.ChangeTaskStatusRequest;
import com.nexawork.project.dtos.requests.CreateTaskRequest;
import com.nexawork.project.dtos.requests.UpdateTaskRequest;
import com.nexawork.project.dtos.responses.TaskResponse;

import java.util.List;
import java.util.UUID;

/**
 * Tâches (§13.2) : CRUD + moteur FSM Kanban (§10.2). Accès réservé aux membres du
 * projet ou aux administrateurs (R15) ; mutations refusées si projet archivé
 * (REF E). Publie {@code task.assigned} et {@code livrable.validated} (§7.2).
 */
public interface TaskService {

    List<TaskResponse> listTasks(UUID projectId);

    /** Vue « Mes tâches » : tâches assignées à l'appelant (projets actifs du workspace). */
    List<TaskResponse> listMyTasks();

    TaskResponse createTask(UUID projectId, CreateTaskRequest request);

    TaskResponse getTask(UUID taskId);

    TaskResponse updateTask(UUID taskId, UpdateTaskRequest request);

    void deleteTask(UUID taskId);

    /** Déplacement Kanban : 200 si transition autorisée, 422 sinon (§10.2). */
    TaskResponse changeStatus(UUID taskId, ChangeTaskStatusRequest request);
}
