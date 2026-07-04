package com.nexawork.project.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.requests.CreateProjectRequest;
import com.nexawork.project.dtos.requests.UpdateProjectRequest;
import com.nexawork.project.dtos.responses.ProjectResponse;
import com.nexawork.project.services.ProjectService;
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
 * Projets (§13.2) : CRUD + archivage/restauration. L'archivage, la restauration
 * et la suppression sont réservés ADMIN+OWNER (R6/R7) ; toute mutation d'un
 * projet archivé est refusée en 409 (REF E).
 */
@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProjectController {

    ProjectService projectService;

    @GetMapping
    public Response<List<ProjectResponse>> list() {
        return Response.<List<ProjectResponse>>ok().setPayload(projectService.listActive());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<ProjectResponse> create(@Valid @RequestBody CreateProjectRequest request) {
        return Response.<ProjectResponse>created().setPayload(projectService.create(request));
    }

    @GetMapping("/{id}")
    public Response<ProjectResponse> get(@PathVariable UUID id) {
        return Response.<ProjectResponse>ok().setPayload(projectService.get(id));
    }

    @PatchMapping("/{id}")
    public Response<ProjectResponse> update(@PathVariable UUID id,
                                            @Valid @RequestBody UpdateProjectRequest request) {
        return Response.<ProjectResponse>ok().setPayload(projectService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public Response<Void> delete(@PathVariable UUID id) {
        projectService.delete(id);
        return Response.deleted();
    }

    @PostMapping("/{id}/archive")
    public Response<ProjectResponse> archive(@PathVariable UUID id) {
        return Response.<ProjectResponse>ok().setPayload(projectService.archive(id));
    }

    @PostMapping("/{id}/restore")
    public Response<ProjectResponse> restore(@PathVariable UUID id) {
        return Response.<ProjectResponse>ok().setPayload(projectService.restore(id));
    }
}
