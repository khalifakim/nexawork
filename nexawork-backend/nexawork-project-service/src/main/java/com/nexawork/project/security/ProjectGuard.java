package com.nexawork.project.security;

import com.nexawork.commons.exceptions.ConflictException;
import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.enums.ProjectStatus;
import com.nexawork.project.repositories.ProjectMemberRepository;
import com.nexawork.project.repositories.ProjectRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Garde-fou transverse du Project Service : isolation multi-tenant, cycle de vie
 * (REF E) et contrôle d'accès projet (chef de projet vs administrateur).
 * Mutualisé par les services de tous les sous-lots de la Phase 4.
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProjectGuard {

    ProjectRepository projectRepository;
    ProjectMemberRepository projectMemberRepository;
    CallerContext caller;

    /**
     * Charge un projet en le bornant au workspace de l'appelant. Un projet d'un
     * autre workspace est traité comme inexistant (404, pas de fuite d'existence).
     */
    public Project loadInOrg(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Projet introuvable."));
        if (!project.getOrganisationId().equals(caller.organisationId())) {
            throw new ResourceNotFoundException("Projet introuvable.");
        }
        return project;
    }

    /** L'appelant est-il le chef de projet fonctionnel (Project.ownerUserId) ? */
    public boolean isProjectLead(Project project) {
        return project.getOwnerUserId().equals(caller.userId());
    }

    /**
     * Visibilité en lecture d'un projet (R15) : administrateur/propriétaire du
     * workspace, ou membre du projet — 403 sinon. À appeler après {@link #loadInOrg}.
     */
    public void requireProjectVisibility(UUID projectId) {
        if (!caller.isWorkspaceAdmin()
                && !projectMemberRepository.existsByProjectIdAndUserId(projectId, caller.userId())) {
            throw new ForbiddenException("Vous n'avez pas accès à ce projet.");
        }
    }

    /**
     * Charge un projet borné au workspace et vérifie que l'appelant en est
     * participant (admin ou membre). Raccourci commun aux ressources de tâches.
     */
    public Project participantProject(UUID projectId) {
        Project project = loadInOrg(projectId);
        requireProjectVisibility(projectId);
        return project;
    }

    /**
     * REF E — refuse toute mutation d'un projet archivé (409). Les mutations
     * légitimes d'un projet archivé passent par les routes `/archived-projects`.
     */
    public void assertActive(Project project) {
        if (project.getStatus() == ProjectStatus.ARCHIVED) {
            throw new ConflictException("Projet archivé : modification interdite. Restaurez-le d'abord.");
        }
    }

    /**
     * Gestion du contenu / de l'équipe d'un projet (R9-R21) : réservée aux
     * administrateurs/propriétaires du workspace ou au chef du projet.
     */
    public void requireProjectManager(Project project, String action) {
        if (!caller.isWorkspaceAdmin() && !isProjectLead(project)) {
            throw new ForbiddenException(
                    "Action réservée aux administrateurs et au chef de projet : " + action);
        }
    }
}
