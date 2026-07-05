package com.nexawork.project.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.requests.CreateCommentRequest;
import com.nexawork.project.dtos.responses.CommentResponse;
import com.nexawork.project.services.TaskCommentService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Commentaires de tâche (§13.2). Réservé aux participants du projet (R15) ;
 * suppression réservée à l'auteur ou à un admin ; refus 409 si projet archivé (REF E).
 */
@RestController
@RequestMapping("/api/v1/tasks/{taskId}/comments")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TaskCommentController {

    TaskCommentService taskCommentService;

    @GetMapping
    public Response<List<CommentResponse>> list(@PathVariable UUID taskId) {
        return Response.<List<CommentResponse>>ok().setPayload(taskCommentService.listComments(taskId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<CommentResponse> add(@PathVariable UUID taskId,
                                         @Valid @RequestBody CreateCommentRequest request) {
        return Response.<CommentResponse>created().setPayload(taskCommentService.addComment(taskId, request));
    }

    @DeleteMapping("/{commentId}")
    public Response<Void> delete(@PathVariable UUID taskId, @PathVariable UUID commentId) {
        taskCommentService.deleteComment(taskId, commentId);
        return Response.deleted();
    }
}
