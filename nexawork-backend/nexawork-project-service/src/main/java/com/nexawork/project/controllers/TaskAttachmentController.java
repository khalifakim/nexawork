package com.nexawork.project.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.requests.CreateAttachmentRequest;
import com.nexawork.project.dtos.responses.AttachmentResponse;
import com.nexawork.project.dtos.responses.TaskAttachmentAggregateResponse;
import com.nexawork.project.services.TaskAttachmentService;
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
 * Pièces jointes de tâches (§13.2) + agrégat projet pour le GED (§10.5bis).
 * Réservé aux participants du projet (R15) ; refus 409 si projet archivé (REF E).
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TaskAttachmentController {

    TaskAttachmentService taskAttachmentService;

    @GetMapping("/tasks/{taskId}/attachments")
    public Response<List<AttachmentResponse>> list(@PathVariable UUID taskId) {
        return Response.<List<AttachmentResponse>>ok().setPayload(taskAttachmentService.listAttachments(taskId));
    }

    @PostMapping("/tasks/{taskId}/attachments")
    @ResponseStatus(HttpStatus.CREATED)
    public Response<AttachmentResponse> add(@PathVariable UUID taskId,
                                            @Valid @RequestBody CreateAttachmentRequest request) {
        return Response.<AttachmentResponse>created().setPayload(taskAttachmentService.addAttachment(taskId, request));
    }

    @DeleteMapping("/tasks/{taskId}/attachments/{attachmentId}")
    public Response<Void> delete(@PathVariable UUID taskId, @PathVariable UUID attachmentId) {
        taskAttachmentService.deleteAttachment(taskId, attachmentId);
        return Response.deleted();
    }

    /**
     * Agrégat des pièces jointes de toutes les tâches d'un projet (§10.5bis).
     * Appelé en HTTP synchrone par le GED Service ; réservé aux membres du projet.
     */
    @GetMapping("/projects/{projectId}/task-attachments")
    public Response<List<TaskAttachmentAggregateResponse>> projectAttachments(@PathVariable UUID projectId) {
        return Response.<List<TaskAttachmentAggregateResponse>>ok()
                .setPayload(taskAttachmentService.listProjectAttachments(projectId));
    }
}
