package com.nexawork.project.controllers;

import com.nexawork.project.dtos.requests.AddCommentRequest;
import com.nexawork.project.dtos.requests.CreateTaskRequest;
import com.nexawork.project.dtos.requests.MoveTaskRequest;
import com.nexawork.project.dtos.responses.TaskCommentResponse;
import com.nexawork.project.dtos.responses.TaskResponse;
import com.nexawork.project.security.SecurityUtils;
import com.nexawork.project.services.TaskService;
import com.nexawork.project.utils.Response;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Tasks")
@RestController
@RequestMapping("/api/v1/projects/{projectId}/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @Operation(summary = "Créer une tâche")
    @PostMapping
    public ResponseEntity<Response<TaskResponse>> create(
            @PathVariable Long projectId,
            @Valid @RequestBody CreateTaskRequest request) {
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        TaskResponse task = taskService.create(projectId, request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Response.created(task, "Tâche créée"));
    }

    @Operation(summary = "Lister les tâches d'un projet")
    @GetMapping
    public ResponseEntity<Response<List<TaskResponse>>> list(@PathVariable Long projectId) {
        return ResponseEntity.ok(Response.ok(taskService.findByProject(projectId), "Tâches récupérées"));
    }

    @Operation(summary = "Récupérer une tâche")
    @GetMapping("/{taskId}")
    public ResponseEntity<Response<TaskResponse>> findById(
            @PathVariable Long projectId, @PathVariable Long taskId) {
        return ResponseEntity.ok(Response.ok(taskService.findById(taskId), "Tâche récupérée"));
    }

    @Operation(summary = "Déplacer une tâche (FSM)")
    @PatchMapping("/{taskId}/move")
    public ResponseEntity<Response<TaskResponse>> move(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @Valid @RequestBody MoveTaskRequest request) {
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        return ResponseEntity.ok(Response.ok(taskService.move(taskId, request, userId), "Tâche déplacée"));
    }

    @Operation(summary = "Ajouter un commentaire")
    @PostMapping("/{taskId}/comments")
    public ResponseEntity<Response<TaskCommentResponse>> addComment(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @Valid @RequestBody AddCommentRequest request) {
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Response.created(taskService.addComment(taskId, request, userId), "Commentaire ajouté"));
    }

    @Operation(summary = "Lister les commentaires")
    @GetMapping("/{taskId}/comments")
    public ResponseEntity<Response<List<TaskCommentResponse>>> getComments(
            @PathVariable Long projectId, @PathVariable Long taskId) {
        return ResponseEntity.ok(Response.ok(taskService.getComments(taskId), "Commentaires récupérés"));
    }
}
