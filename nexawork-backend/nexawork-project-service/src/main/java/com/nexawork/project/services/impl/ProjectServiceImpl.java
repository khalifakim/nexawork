package com.nexawork.project.services.impl;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.project.dtos.requests.CreateProjectRequest;
import com.nexawork.project.dtos.requests.UpdateProjectRequest;
import com.nexawork.project.dtos.responses.ProjectResponse;
import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.ProjectMember;
import com.nexawork.project.entities.enums.ProjectRole;
import com.nexawork.project.entities.enums.ProjectStatus;
import com.nexawork.project.events.publishers.ProjectCreatedEvent;
import com.nexawork.project.events.publishers.ProjectEventPublisher;
import com.nexawork.project.mappers.ProjectMapper;
import com.nexawork.project.repositories.ProjectMemberRepository;
import com.nexawork.project.repositories.ProjectRepository;
import com.nexawork.project.security.CallerContext;
import com.nexawork.project.security.ProjectGuard;
import com.nexawork.project.services.ProjectService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Projets (§13.2). Isolation multi-tenant, règles R6/R7 (archivage / restauration
 * / suppression / consultation des archivés = ADMIN+OWNER) et REF E (mutation
 * d'un projet archivé refusée en 409).
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProjectServiceImpl implements ProjectService {

    ProjectRepository projectRepository;
    ProjectMemberRepository projectMemberRepository;
    ProjectMapper projectMapper;
    ProjectEventPublisher eventPublisher;
    ProjectGuard guard;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponse> listActive() {
        List<Project> projects = projectRepository.findVisible(
                caller.organisationId(), ProjectStatus.ACTIVE, caller.userId(), caller.isWorkspaceAdmin());
        return projects.stream().map(this::toDto).toList();
    }

    @Override
    public ProjectResponse create(CreateProjectRequest request) {
        UUID userId = caller.userId();
        Project project = projectRepository.save(Project.builder()
                .name(request.getName())
                .color(request.getColor())
                .organisationId(caller.organisationId())
                .ownerUserId(userId)
                .status(ProjectStatus.ACTIVE)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .enforceWorkflowOrder(false)
                .build());

        // Le créateur devient chef de projet (MANAGER, isProjectLead) — V5.1 §4.2.
        projectMemberRepository.save(ProjectMember.builder()
                .project(project)
                .userId(userId)
                .projectRole(ProjectRole.MANAGER)
                .isProjectLead(true)
                .build());

        eventPublisher.publishProjectCreated(new ProjectCreatedEvent(
                project.getId(), project.getName(), project.getOrganisationId(), project.getOwnerUserId()));

        log.info("Projet '{}' créé ({}) par {}", project.getName(), project.getId(), userId);
        return toDto(project);
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectResponse get(UUID projectId) {
        Project project = guard.loadInOrg(projectId);
        if (!caller.isWorkspaceAdmin()
                && !projectMemberRepository.existsByProjectIdAndUserId(projectId, caller.userId())) {
            throw new ForbiddenException("Vous n'avez pas accès à ce projet.");
        }
        return toDto(project);
    }

    @Override
    public ProjectResponse update(UUID projectId, UpdateProjectRequest request) {
        Project project = guard.loadInOrg(projectId);
        guard.assertActive(project);
        guard.requireProjectManager(project, "modifier le projet");

        if (request.getName() != null && !request.getName().isBlank()) {
            project.setName(request.getName());
        }
        if (request.getDescription() != null) {
            project.setDescription(request.getDescription());
        }
        if (request.getColor() != null) {
            project.setColor(request.getColor());
        }
        if (request.getStartDate() != null) {
            project.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            project.setEndDate(request.getEndDate());
        }
        if (request.getEnforceWorkflowOrder() != null) {
            project.setEnforceWorkflowOrder(request.getEnforceWorkflowOrder());
        }
        return toDto(projectRepository.save(project));
    }

    @Override
    public void delete(UUID projectId) {
        Project project = guard.loadInOrg(projectId);
        caller.requireWorkspaceAdmin("supprimer un projet");
        projectRepository.delete(project); // cascade DB : membres, équipes, statuts, tâches...
        log.info("Projet {} supprimé par {}", projectId, caller.userId());
    }

    @Override
    public ProjectResponse archive(UUID projectId) {
        Project project = guard.loadInOrg(projectId);
        caller.requireWorkspaceAdmin("archiver un projet");
        project.setStatus(ProjectStatus.ARCHIVED);
        return toDto(projectRepository.save(project));
    }

    @Override
    public ProjectResponse restore(UUID projectId) {
        Project project = guard.loadInOrg(projectId);
        caller.requireWorkspaceAdmin("restaurer un projet");
        project.setStatus(ProjectStatus.ACTIVE);
        return toDto(projectRepository.save(project));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponse> listArchived() {
        caller.requireWorkspaceAdmin("consulter les projets archivés"); // R6
        return projectRepository
                .findByOrganisationIdAndStatus(caller.organisationId(), ProjectStatus.ARCHIVED)
                .stream().map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectResponse getArchived(UUID projectId) {
        caller.requireWorkspaceAdmin("consulter un projet archivé"); // R6
        Project project = guard.loadInOrg(projectId);
        return toDto(project);
    }

    private ProjectResponse toDto(Project project) {
        ProjectResponse dto = projectMapper.asDto(project);
        dto.setMemberCount((int) projectMemberRepository.countByProjectId(project.getId()));
        return dto;
    }
}
