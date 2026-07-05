package com.nexawork.project.services.impl;

import com.nexawork.commons.exceptions.ConflictException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.project.dtos.requests.CreateStatusRequest;
import com.nexawork.project.dtos.requests.UpdateStatusRequest;
import com.nexawork.project.dtos.responses.StatusResponse;
import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.WorkflowStatus;
import com.nexawork.project.mappers.StatusMapper;
import com.nexawork.project.repositories.WorkflowStatusRepository;
import com.nexawork.project.repositories.WorkflowTransitionRepository;
import com.nexawork.project.security.ProjectGuard;
import com.nexawork.project.services.WorkflowRules;
import com.nexawork.project.services.WorkflowStatusService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Statuts Kanban (§8.2.1). R8 (ADMIN+OWNER+chef de projet) + REF E.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WorkflowStatusServiceImpl implements WorkflowStatusService {

    WorkflowStatusRepository statusRepository;
    WorkflowTransitionRepository transitionRepository;
    StatusMapper statusMapper;
    ProjectGuard guard;

    @Override
    @Transactional(readOnly = true)
    public List<StatusResponse> listStatuses(UUID projectId) {
        guard.loadInOrg(projectId); // borne au workspace (404 sinon)
        guard.requireProjectVisibility(projectId); // R15 : admin ou membre du projet
        return statusMapper.parse(statusRepository.findByProjectIdOrderByPositionAsc(projectId));
    }

    @Override
    public StatusResponse createStatus(UUID projectId, CreateStatusRequest request) {
        Project project = guard.loadInOrg(projectId);
        guard.assertActive(project);
        guard.requireProjectManager(project, "gérer les statuts");

        int position = request.getPosition() != null
                ? request.getPosition()
                : statusRepository.findByProjectIdOrderByPositionAsc(projectId).size();

        WorkflowStatus status = WorkflowStatus.builder()
                .project(project)
                .name(request.getName())
                .category(request.getCategory())
                .position(position)
                .isInitial(WorkflowRules.isInitial(request.getCategory()))
                .isFinal(WorkflowRules.isFinal(request.getCategory()))
                .color(request.getColor() != null ? request.getColor() : "#6c757d")
                .build();
        return statusMapper.asDto(statusRepository.save(status));
    }

    @Override
    public StatusResponse updateStatus(UUID statusId, UpdateStatusRequest request) {
        WorkflowStatus status = statusRepository.findById(statusId)
                .orElseThrow(() -> new ResourceNotFoundException("Statut introuvable."));
        Project project = guard.loadInOrg(status.getProject().getId());
        guard.assertActive(project);
        guard.requireProjectManager(project, "modifier un statut");

        if (request.getName() != null && !request.getName().isBlank()) {
            status.setName(request.getName());
        }
        if (request.getColor() != null) {
            status.setColor(request.getColor());
        }
        if (request.getPosition() != null) {
            status.setPosition(request.getPosition());
        }
        if (request.getCategory() != null) {
            status.setCategory(request.getCategory());
            status.setIsInitial(WorkflowRules.isInitial(request.getCategory()));
            status.setIsFinal(WorkflowRules.isFinal(request.getCategory()));
        }
        return statusMapper.asDto(statusRepository.save(status));
    }

    @Override
    public void deleteStatus(UUID statusId) {
        WorkflowStatus status = statusRepository.findById(statusId)
                .orElseThrow(() -> new ResourceNotFoundException("Statut introuvable."));
        Project project = guard.loadInOrg(status.getProject().getId());
        guard.assertActive(project);
        guard.requireProjectManager(project, "supprimer un statut");

        // Statut cible d'une transition : protégé (FK RESTRICT) → 409 explicite.
        if (transitionRepository.existsByToStatusId(statusId)) {
            throw new ConflictException(
                    "Ce statut est la cible d'une transition. Supprimez d'abord cette transition.");
        }
        // Les tâches positionnées sur ce statut repassent à statut nul (FK SET NULL) ;
        // les transitions sortantes sont supprimées en cascade (from_status CASCADE).
        statusRepository.delete(status);
    }
}
