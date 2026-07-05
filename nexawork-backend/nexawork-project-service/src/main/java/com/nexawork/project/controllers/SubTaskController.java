package com.nexawork.project.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.requests.CreateSubTaskRequest;
import com.nexawork.project.dtos.requests.UpdateSubTaskRequest;
import com.nexawork.project.dtos.responses.SubTaskResponse;
import com.nexawork.project.services.SubTaskService;
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
 * Sous-tâches (§13.2). Réservé aux participants du projet (R15) ; refus 409 si
 * projet archivé (REF E).
 */
@RestController
@RequestMapping("/api/v1/tasks/{taskId}/subtasks")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SubTaskController {

    SubTaskService subTaskService;

    @GetMapping
    public Response<List<SubTaskResponse>> list(@PathVariable UUID taskId) {
        return Response.<List<SubTaskResponse>>ok().setPayload(subTaskService.listSubTasks(taskId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<SubTaskResponse> add(@PathVariable UUID taskId,
                                         @Valid @RequestBody CreateSubTaskRequest request) {
        return Response.<SubTaskResponse>created().setPayload(subTaskService.addSubTask(taskId, request));
    }

    @PatchMapping("/{subTaskId}")
    public Response<SubTaskResponse> update(@PathVariable UUID taskId,
                                            @PathVariable UUID subTaskId,
                                            @Valid @RequestBody UpdateSubTaskRequest request) {
        return Response.<SubTaskResponse>ok().setPayload(subTaskService.updateSubTask(taskId, subTaskId, request));
    }

    @DeleteMapping("/{subTaskId}")
    public Response<Void> delete(@PathVariable UUID taskId, @PathVariable UUID subTaskId) {
        subTaskService.deleteSubTask(taskId, subTaskId);
        return Response.deleted();
    }
}
