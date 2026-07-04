package com.nexawork.project.services;

import com.nexawork.project.dtos.requests.CreateProjectRequest;
import com.nexawork.project.dtos.requests.UpdateProjectRequest;
import com.nexawork.project.dtos.responses.ProjectResponse;

import java.util.List;
import java.util.UUID;

/**
 * Projets (V5.1 §13.2) : CRUD + archivage/restauration. Isolation multi-tenant
 * par workspace ; règles R6/R7 (archivage/suppression/consultation archivés =
 * ADMIN+OWNER) et REF E (mutation d'un projet archivé refusée 409).
 */
public interface ProjectService {

    List<ProjectResponse> listActive();

    ProjectResponse create(CreateProjectRequest request);

    ProjectResponse get(UUID projectId);

    ProjectResponse update(UUID projectId, UpdateProjectRequest request);

    void delete(UUID projectId);

    ProjectResponse archive(UUID projectId);

    ProjectResponse restore(UUID projectId);

    List<ProjectResponse> listArchived();

    ProjectResponse getArchived(UUID projectId);
}
