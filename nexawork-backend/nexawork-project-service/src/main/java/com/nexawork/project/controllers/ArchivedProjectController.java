package com.nexawork.project.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.responses.ProjectResponse;
import com.nexawork.project.services.ProjectService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Projets archivés (REF E, R6) — consultation réservée ADMIN+OWNER (403 sinon).
 * Vue en lecture seule ; la restauration passe par {@code POST /projects/{id}/restore}.
 */
@RestController
@RequestMapping("/api/v1/archived-projects")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ArchivedProjectController {

    ProjectService projectService;

    @GetMapping
    public Response<List<ProjectResponse>> list() {
        return Response.<List<ProjectResponse>>ok().setPayload(projectService.listArchived());
    }

    @GetMapping("/{id}")
    public Response<ProjectResponse> get(@PathVariable UUID id) {
        return Response.<ProjectResponse>ok().setPayload(projectService.getArchived(id));
    }
}
