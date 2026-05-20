package com.nexawork.project.controllers;

import com.nexawork.project.dtos.requests.CreateProjectRequest;
import com.nexawork.project.dtos.responses.ProjectResponse;
import com.nexawork.project.dtos.responses.WorkflowStatusResponse;
import com.nexawork.project.security.SecurityUtils;
import com.nexawork.project.services.ProjectService;
import com.nexawork.project.utils.Response;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Projects")
@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @Operation(summary = "Créer un projet")
    @PostMapping
    public ResponseEntity<Response<ProjectResponse>> create(@Valid @RequestBody CreateProjectRequest request) {
        Long orgId  = SecurityUtils.getCurrentOrganisationId().orElseThrow(() -> new RuntimeException("Organisation manquante"));
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Utilisateur non identifié"));
        ProjectResponse response = projectService.create(request, orgId, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Response.created(response, "Projet créé"));
    }

    @Operation(summary = "Lister les projets de l'organisation")
    @GetMapping
    public ResponseEntity<Response<List<ProjectResponse>>> list() {
        Long orgId = SecurityUtils.getCurrentOrganisationId().orElseThrow(() -> new RuntimeException("Organisation manquante"));
        return ResponseEntity.ok(Response.ok(projectService.findByOrganisation(orgId), "Projets récupérés"));
    }

    @Operation(summary = "Récupérer un projet")
    @GetMapping("/{id}")
    public ResponseEntity<Response<ProjectResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(Response.ok(projectService.findById(id), "Projet récupéré"));
    }

    @Operation(summary = "Workflow du projet")
    @GetMapping("/{id}/workflow")
    public ResponseEntity<Response<List<WorkflowStatusResponse>>> getWorkflow(@PathVariable Long id) {
        return ResponseEntity.ok(Response.ok(projectService.getWorkflow(id), "Workflow récupéré"));
    }

    @Operation(summary = "Archiver un projet")
    @PatchMapping("/{id}/archive")
    public ResponseEntity<Response<Void>> archive(@PathVariable Long id) {
        projectService.archive(id);
        return ResponseEntity.ok(Response.ok(null, "Projet archivé"));
    }
}
