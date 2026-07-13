package com.nexawork.project.services.impl;

import com.nexawork.commons.exceptions.ConflictException;
import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.project.dtos.requests.CreateProjectRequest;
import com.nexawork.project.dtos.requests.UpdateProjectRequest;
import com.nexawork.project.dtos.responses.ProjectResponse;
import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.enums.ProjectStatus;
import com.nexawork.project.events.publishers.ProjectCreatedEvent;
import com.nexawork.project.events.publishers.ProjectEventPublisher;
import com.nexawork.project.mappers.ProjectMapper;
import com.nexawork.project.repositories.ProjectMemberRepository;
import com.nexawork.project.repositories.ProjectRepository;
import com.nexawork.project.security.CallerContext;
import com.nexawork.project.security.ProjectGuard;
import com.nexawork.project.services.ProjectService;
import com.nexawork.project.services.WorkflowSeeder;
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
    WorkflowSeeder workflowSeeder;
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
        // CU-A03 : la création d'un projet est réservée à l'administrateur (ou au
        // propriétaire) du workspace ; le chef de projet est désigné ensuite (CU-CP05).
        caller.requireWorkspaceAdmin("créer un projet");
        String prefix = generateUniquePrefix(request.getPrefix(), request.getName(), caller.organisationId());
        Project project = projectRepository.save(Project.builder()
                .name(request.getName())
                .prefix(prefix)
                .taskSequence(0)
                .color(request.getColor())
                .organisationId(caller.organisationId())
                // Pas de chef de projet à la création : il est désigné explicitement
                // ensuite (CU-CP05). ownerUserId reste null tant qu'aucun chef n'est nommé.
                .ownerUserId(null)
                .status(ProjectStatus.ACTIVE)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .enforceWorkflowOrder(false)
                .build());

        // Aucun membre n'est ajouté d'office : l'administrateur crée le projet, il
        // n'en devient ni membre ni chef. Il ajoute explicitement les collaborateurs
        // ensuite (et peut s'ajouter lui-même s'il le souhaite).

        // Workflow Kanban par défaut (4 colonnes + transitions) — V5.1 §8.1.
        workflowSeeder.seedDefault(project);

        // Le projet n'a pas encore de chef (ownerUserId null) : on transmet le
        // créateur, dont les consumers (GED, Messaging) ont besoin pour tracer
        // l'auteur des dossiers et canaux seedés.
        eventPublisher.publishProjectCreated(new ProjectCreatedEvent(
                project.getId(), project.getName(), project.getOrganisationId(), caller.userId()));

        log.info("Projet '{}' créé ({}) par {}", project.getName(), project.getId(), caller.userId());
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
        // Changement de préfixe : unique par workspace ; les task_key déjà émises restent inchangées.
        if (request.getPrefix() != null && !request.getPrefix().isBlank()) {
            String newPrefix = sanitizePrefix(request.getPrefix());
            if (!newPrefix.isEmpty() && !newPrefix.equals(project.getPrefix())) {
                if (projectRepository.existsByOrganisationIdAndPrefix(project.getOrganisationId(), newPrefix)) {
                    throw new ConflictException("Ce préfixe est déjà utilisé dans ce workspace.");
                }
                project.setPrefix(newPrefix);
            }
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

    // ─── Génération du préfixe des task_key ──────────────────────────────────────

    /**
     * Détermine un préfixe unique dans le workspace : celui demandé s'il est fourni,
     * sinon dérivé du nom (initiales si multi-mots, sinon 3 premières lettres). En cas
     * de collision, suffixe numérique (AM → AM1, AM2, …).
     */
    private String generateUniquePrefix(String requested, String name, UUID orgId) {
        String base = (requested != null && !requested.isBlank())
                ? sanitizePrefix(requested)
                : derivePrefix(name);
        if (base.isEmpty()) {
            base = "PRJ";
        }
        if (base.length() > 10) {
            base = base.substring(0, 10);
        }
        String candidate = base;
        int suffix = 1;
        while (projectRepository.existsByOrganisationIdAndPrefix(orgId, candidate)) {
            String stem = base.length() > 8 ? base.substring(0, 8) : base;
            candidate = stem + suffix;
            suffix++;
        }
        return candidate;
    }

    /** Dérive un préfixe depuis le nom : initiales des mots (≥ 2 mots) ou 3 premières lettres. */
    private String derivePrefix(String name) {
        String[] words = name.trim().split("\\s+");
        String base;
        if (words.length >= 2) {
            StringBuilder sb = new StringBuilder();
            for (String w : words) {
                if (!w.isEmpty()) {
                    sb.append(Character.toUpperCase(w.charAt(0)));
                }
            }
            base = sb.toString();
        } else {
            String alnum = name.trim().replaceAll("[^A-Za-z0-9]", "");
            base = alnum.substring(0, Math.min(3, alnum.length())).toUpperCase();
        }
        return base.replaceAll("[^A-Z0-9]", "");
    }

    private String sanitizePrefix(String s) {
        return s.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
    }
}
