package com.nexawork.project.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.requests.CreateStatusRequest;
import com.nexawork.project.dtos.requests.UpdateStatusRequest;
import com.nexawork.project.dtos.responses.StatusResponse;
import com.nexawork.project.services.WorkflowStatusService;
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
 * Statuts Kanban (§13.2, §8.2.1) : list/add sous le projet, patch/delete par id.
 * Gestion réservée ADMIN+OWNER+chef de projet (R8) ; refus 409 si projet archivé
 * (REF E).
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WorkflowStatusController {

    WorkflowStatusService statusService;

    @GetMapping("/projects/{projectId}/statuses")
    public Response<List<StatusResponse>> list(@PathVariable UUID projectId) {
        return Response.<List<StatusResponse>>ok().setPayload(statusService.listStatuses(projectId));
    }

    @PostMapping("/projects/{projectId}/statuses")
    @ResponseStatus(HttpStatus.CREATED)
    public Response<StatusResponse> create(@PathVariable UUID projectId,
                                           @Valid @RequestBody CreateStatusRequest request) {
        return Response.<StatusResponse>created().setPayload(statusService.createStatus(projectId, request));
    }

    @PatchMapping("/statuses/{id}")
    public Response<StatusResponse> update(@PathVariable UUID id,
                                           @Valid @RequestBody UpdateStatusRequest request) {
        return Response.<StatusResponse>ok().setPayload(statusService.updateStatus(id, request));
    }

    @DeleteMapping("/statuses/{id}")
    public Response<Void> delete(@PathVariable UUID id) {
        statusService.deleteStatus(id);
        return Response.deleted();
    }
}
