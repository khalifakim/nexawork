package com.nexawork.project.services.impl;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.commons.exceptions.ResourceAlreadyExistException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.project.dtos.requests.AddProjectMemberRequest;
import com.nexawork.project.dtos.requests.UpdateProjectMemberRequest;
import com.nexawork.project.dtos.responses.ProjectMemberResponse;
import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.ProjectMember;
import com.nexawork.project.entities.Team;
import com.nexawork.project.entities.enums.ProjectRole;
import com.nexawork.project.mappers.ProjectMemberMapper;
import com.nexawork.project.repositories.ProjectMemberRepository;
import com.nexawork.project.repositories.ProjectRepository;
import com.nexawork.project.repositories.TeamRepository;
import com.nexawork.project.security.CallerContext;
import com.nexawork.project.security.ProjectGuard;
import com.nexawork.project.services.ProjectMemberService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Membres d'un projet (§13.2). Gestion réservée ADMIN+OWNER+chef de projet
 * (R9-R21) ; mutations refusées sur projet archivé (REF E).
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProjectMemberServiceImpl implements ProjectMemberService {

    ProjectRepository projectRepository;
    ProjectMemberRepository projectMemberRepository;
    TeamRepository teamRepository;
    ProjectMemberMapper memberMapper;
    ProjectGuard guard;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> listMembers(UUID projectId) {
        guard.loadInOrg(projectId);
        if (!caller.isWorkspaceAdmin()
                && !projectMemberRepository.existsByProjectIdAndUserId(projectId, caller.userId())) {
            throw new ForbiddenException("Vous n'avez pas accès à ce projet.");
        }
        return memberMapper.parse(projectMemberRepository.findByProjectId(projectId));
    }

    @Override
    public ProjectMemberResponse addMember(UUID projectId, AddProjectMemberRequest request) {
        Project project = guard.loadInOrg(projectId);
        guard.assertActive(project);
        guard.requireProjectManager(project, "ajouter un membre");

        if (projectMemberRepository.existsByProjectIdAndUserId(projectId, request.getUserId())) {
            throw new ResourceAlreadyExistException("Cet utilisateur est déjà membre du projet.");
        }

        ProjectMember member = ProjectMember.builder()
                .project(project)
                .userId(request.getUserId())
                .projectRole(request.getProjectRole() != null ? request.getProjectRole() : ProjectRole.PROJECT_MEMBER)
                .team(resolveTeam(project, request.getTeamId()))
                .isProjectLead(false)
                .build();
        // saveAndFlush : peuple joinedAt (@CreationTimestamp) avant le mapping.
        return memberMapper.asDto(projectMemberRepository.saveAndFlush(member));
    }

    @Override
    public ProjectMemberResponse updateMember(UUID projectId, UUID userId, UpdateProjectMemberRequest request) {
        Project project = guard.loadInOrg(projectId);
        guard.assertActive(project);
        guard.requireProjectManager(project, "modifier un membre");

        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Membre introuvable dans ce projet."));

        if (request.getProjectRole() != null) {
            member.setProjectRole(request.getProjectRole());
        }
        if (Boolean.TRUE.equals(request.getClearTeam())) {
            member.setTeam(null);
        } else if (request.getTeamId() != null) {
            member.setTeam(resolveTeam(project, request.getTeamId()));
        }
        if (request.getIsProjectLead() != null) {
            member.setIsProjectLead(request.getIsProjectLead());
        }

        // Désignation du chef de projet fonctionnel (Project.ownerUserId, V5.1 §4.2).
        if (Boolean.TRUE.equals(request.getSetAsProjectChief())) {
            project.setOwnerUserId(userId);
            member.setIsProjectLead(true);
            projectRepository.save(project);
            log.info("Chef de projet du projet {} redéfini sur {}", projectId, userId);
        }
        return memberMapper.asDto(projectMemberRepository.save(member));
    }

    @Override
    public void removeMember(UUID projectId, UUID userId) {
        Project project = guard.loadInOrg(projectId);
        guard.assertActive(project);
        guard.requireProjectManager(project, "retirer un membre");

        if (project.getOwnerUserId().equals(userId)) {
            throw new InvalidRequestException(
                    "Impossible de retirer le chef de projet. Désignez d'abord un autre chef.");
        }

        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Membre introuvable dans ce projet."));
        projectMemberRepository.delete(member);
    }

    /** Charge une équipe en vérifiant qu'elle appartient bien au projet (400 sinon). */
    private Team resolveTeam(Project project, UUID teamId) {
        if (teamId == null) {
            return null;
        }
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Équipe introuvable."));
        if (!team.getProject().getId().equals(project.getId())) {
            throw new InvalidRequestException("L'équipe n'appartient pas à ce projet.");
        }
        return team;
    }
}
