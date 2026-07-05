package com.nexawork.project.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.requests.ChangeTaskStatusRequest;
import com.nexawork.project.dtos.requests.CreateTaskRequest;
import com.nexawork.project.dtos.requests.UpdateTaskRequest;
import com.nexawork.project.dtos.responses.TaskResponse;
import com.nexawork.project.services.TaskService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Tâches (§13.2) : list/create sous le projet, get/patch/delete par id,
 * déplacement Kanban FSM (200/422). Réservé aux participants du projet (R15) ;
 * mutations refusées si projet archivé (REF E).
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TaskController {

    TaskService taskService;

    @GetMapping("/projects/{projectId}/tasks")
    public Response<List<TaskResponse>> list(@PathVariable UUID projectId) {
        return Response.<List<TaskResponse>>ok().setPayload(taskService.listTasks(projectId));
    }

    @PostMapping("/projects/{projectId}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public Response<TaskResponse> create(@PathVariable UUID projectId,
                                         @Valid @RequestBody CreateTaskRequest request) {
        return Response.<TaskResponse>created().setPayload(taskService.createTask(projectId, request));
    }

    @GetMapping("/tasks/{id}")
    public Response<TaskResponse> get(@PathVariable UUID id) {
        return Response.<TaskResponse>ok().setPayload(taskService.getTask(id));
    }

    @PatchMapping("/tasks/{id}")
    public Response<TaskResponse> update(@PathVariable UUID id,
                                         @Valid @RequestBody UpdateTaskRequest request) {
        return Response.<TaskResponse>ok().setPayload(taskService.updateTask(id, request));
    }

    @DeleteMapping("/tasks/{id}")
    public Response<Void> delete(@PathVariable UUID id) {
        taskService.deleteTask(id);
        return Response.deleted();
    }

    @PatchMapping("/tasks/{id}/status")
    public Response<TaskResponse> changeStatus(@PathVariable UUID id,
                                               @Valid @RequestBody ChangeTaskStatusRequest request) {
        return Response.<TaskResponse>ok().setPayload(taskService.changeStatus(id, request));
    }
}
