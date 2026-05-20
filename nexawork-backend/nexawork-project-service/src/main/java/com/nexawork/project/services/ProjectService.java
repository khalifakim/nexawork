package com.nexawork.project.services;

import com.nexawork.project.dtos.requests.CreateProjectRequest;
import com.nexawork.project.dtos.responses.ProjectResponse;
import com.nexawork.project.dtos.responses.WorkflowStatusResponse;
import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.ProjectMember;
import com.nexawork.project.entities.WorkflowStatus;
import com.nexawork.project.entities.enums.ProjectRole;
import com.nexawork.project.entities.enums.ProjectStatus;
import com.nexawork.project.events.publishers.ProjectCreatedEvent;
import com.nexawork.project.events.publishers.ProjectEventPublisher;
import com.nexawork.project.exceptions.ResourceNotFoundException;
import com.nexawork.project.repositories.ProjectMemberRepository;
import com.nexawork.project.repositories.ProjectRepository;
import com.nexawork.project.repositories.WorkflowStatusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepo;
    private final ProjectMemberRepository memberRepo;
    private final WorkflowStatusRepository statusRepo;
    private final ProjectEventPublisher eventPublisher;

    @Transactional
    public ProjectResponse create(CreateProjectRequest request, Long organisationId, Long ownerUserId) {
        Project project = Project.builder()
            .name(request.name())
            .description(request.description())
            .organisationId(organisationId)
            .ownerUserId(ownerUserId)
            .status(ProjectStatus.ACTIVE)
            .build();
        projectRepo.save(project);

        ProjectMember owner = ProjectMember.builder()
            .project(project)
            .userId(ownerUserId)
            .projectRole(ProjectRole.MANAGER)
            .joinedAt(LocalDateTime.now())
            .build();
        memberRepo.save(owner);

        createDefaultWorkflow(project);

        eventPublisher.publishProjectCreated(new ProjectCreatedEvent(
            project.getId(), project.getName(), organisationId, ownerUserId));

        return toResponse(project);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> findByOrganisation(Long organisationId) {
        return projectRepo.findByOrganisationId(organisationId).stream()
            .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProjectResponse findById(Long id) {
        return toResponse(getOrThrow(id));
    }

    @Transactional(readOnly = true)
    public List<WorkflowStatusResponse> getWorkflow(Long projectId) {
        return statusRepo.findByProjectIdOrderByPosition(projectId).stream()
            .map(s -> new WorkflowStatusResponse(
                s.getId(), projectId, s.getName(), s.getPosition(), s.getIsFinal()))
            .collect(Collectors.toList());
    }

    @Transactional
    public void archive(Long id) {
        Project p = getOrThrow(id);
        p.setStatus(ProjectStatus.ARCHIVED);
        projectRepo.save(p);
    }

    private void createDefaultWorkflow(Project project) {
        List<String> defaults = List.of("À faire", "En cours", "En revue", "Terminé");
        for (int i = 0; i < defaults.size(); i++) {
            WorkflowStatus ws = WorkflowStatus.builder()
                .project(project)
                .name(defaults.get(i))
                .position(i + 1)
                .isFinal(i == defaults.size() - 1)
                .build();
            statusRepo.save(ws);
        }
    }

    private Project getOrThrow(Long id) {
        return projectRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Projet introuvable : " + id));
    }

    private ProjectResponse toResponse(Project p) {
        return new ProjectResponse(
            p.getId(), p.getName(), p.getDescription(),
            p.getOrganisationId(), p.getOwnerUserId(),
            p.getStatus(), p.getCreatedDate());
    }
}
