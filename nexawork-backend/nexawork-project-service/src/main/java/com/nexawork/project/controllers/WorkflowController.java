package com.nexawork.project.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.requests.UpdateWorkflowRequest;
import com.nexawork.project.dtos.responses.WorkflowResponse;
import com.nexawork.project.services.WorkflowService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Configuration du workflow d'un projet (§13.2, §8.2.2) : ordre imposé +
 * responsables de transitions. Réservée ADMIN+OWNER+chef de projet (R8) ; refus
 * 409 si projet archivé (REF E).
 */
@RestController
@RequestMapping("/api/v1/projects/{projectId}/workflow")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WorkflowController {

    WorkflowService workflowService;

    @PatchMapping
    public Response<WorkflowResponse> update(@PathVariable UUID projectId,
                                             @Valid @RequestBody UpdateWorkflowRequest request) {
        return Response.<WorkflowResponse>ok().setPayload(workflowService.updateWorkflow(projectId, request));
    }
}
