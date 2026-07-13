package com.nexawork.project.services.impl;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.project.dtos.requests.CreateTeamRequest;
import com.nexawork.project.dtos.requests.UpdateTeamRequest;
import com.nexawork.project.dtos.responses.TeamResponse;
import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.Team;
import com.nexawork.project.mappers.TeamMapper;
import com.nexawork.project.repositories.ProjectMemberRepository;
import com.nexawork.project.repositories.TeamRepository;
import com.nexawork.project.security.CallerContext;
import com.nexawork.project.security.ProjectGuard;
import com.nexawork.project.services.TeamService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Équipes d'un projet (§13.2, §10). Création réservée ADMIN+OWNER+chef de projet
 * (R9-R21) ; refusée si projet archivé (REF E).
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TeamServiceImpl implements TeamService {

    TeamRepository teamRepository;
    ProjectMemberRepository projectMemberRepository;
    TeamMapper teamMapper;
    ProjectGuard guard;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponse> listTeams(UUID projectId) {
        guard.loadInOrg(projectId);
        if (!caller.isWorkspaceAdmin()
                && !projectMemberRepository.existsByProjectIdAndUserId(projectId, caller.userId())) {
            throw new ForbiddenException("Vous n'avez pas accès à ce projet.");
        }
        return teamMapper.parse(teamRepository.findByProjectId(projectId));
    }

    @Override
    public TeamResponse createTeam(UUID projectId, CreateTeamRequest request) {
        Project project = guard.loadInOrg(projectId);
        guard.assertActive(project);
        guard.requireProjectManager(project, "créer une équipe");

        // saveAndFlush : force l'insert pour peupler createdAt (@CreationTimestamp)
        // avant le mapping de la réponse.
        Team team = teamRepository.saveAndFlush(Team.builder()
                .project(project)
                .name(request.getName())
                .color(request.getColor())
                .build());
        return teamMapper.asDto(team);
    }

    @Override
    public TeamResponse updateTeam(UUID projectId, UUID teamId, UpdateTeamRequest request) {
        Project project = guard.loadInOrg(projectId);
        guard.assertActive(project);
        guard.requireProjectManager(project, "modifier une équipe");

        Team team = loadTeamOfProject(teamId, projectId);
        if (request.getName() != null && !request.getName().isBlank()) {
            team.setName(request.getName().trim());
        }
        if (request.getColor() != null && !request.getColor().isBlank()) {
            team.setColor(request.getColor());
        }
        return teamMapper.asDto(teamRepository.save(team));
    }

    @Override
    public void deleteTeam(UUID projectId, UUID teamId) {
        Project project = guard.loadInOrg(projectId);
        guard.assertActive(project);
        guard.requireProjectManager(project, "supprimer une équipe");

        Team team = loadTeamOfProject(teamId, projectId);
        // Les membres rattachés repassent « sans équipe » (FK ON DELETE SET NULL).
        teamRepository.delete(team);
    }

    /** Charge une équipe en vérifiant qu'elle appartient bien au projet (404 sinon). */
    private Team loadTeamOfProject(UUID teamId, UUID projectId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Équipe introuvable."));
        if (!team.getProject().getId().equals(projectId)) {
            throw new ResourceNotFoundException("Équipe introuvable dans ce projet.");
        }
        return team;
    }
}
