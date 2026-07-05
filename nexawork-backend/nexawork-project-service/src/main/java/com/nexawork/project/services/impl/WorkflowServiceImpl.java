package com.nexawork.project.services.impl;

import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.project.dtos.requests.UpdateWorkflowRequest;
import com.nexawork.project.dtos.responses.WorkflowResponse;
import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.WorkflowTransition;
import com.nexawork.project.entities.enums.TransitionResponsibleType;
import com.nexawork.project.mappers.StatusMapper;
import com.nexawork.project.mappers.TransitionMapper;
import com.nexawork.project.repositories.ProjectRepository;
import com.nexawork.project.repositories.WorkflowStatusRepository;
import com.nexawork.project.repositories.WorkflowTransitionRepository;
import com.nexawork.project.security.ProjectGuard;
import com.nexawork.project.services.WorkflowService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Configuration du workflow (§8.2.2) : bascule « imposer l'ordre » et mise à jour
 * groupée des responsables de transitions. R8 (ADMIN+OWNER+chef de projet) + REF E.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WorkflowServiceImpl implements WorkflowService {

    ProjectRepository projectRepository;
    WorkflowStatusRepository statusRepository;
    WorkflowTransitionRepository transitionRepository;
    StatusMapper statusMapper;
    TransitionMapper transitionMapper;
    ProjectGuard guard;

    @Override
    public WorkflowResponse updateWorkflow(UUID projectId, UpdateWorkflowRequest request) {
        Project project = guard.loadInOrg(projectId);
        guard.assertActive(project);
        guard.requireProjectManager(project, "configurer le workflow");

        if (request.getEnforceWorkflowOrder() != null) {
            project.setEnforceWorkflowOrder(request.getEnforceWorkflowOrder());
            projectRepository.save(project);
        }

        if (request.getTransitions() != null) {
            for (UpdateWorkflowRequest.TransitionResponsibleUpdate update : request.getTransitions()) {
                WorkflowTransition transition = transitionRepository.findById(update.getTransitionId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Transition introuvable : " + update.getTransitionId()));
                if (!transition.getFromStatus().getProject().getId().equals(projectId)) {
                    throw new InvalidRequestException(
                            "La transition " + update.getTransitionId() + " n'appartient pas à ce projet.");
                }
                if (update.getResponsibleType() != null) {
                    transition.setResponsibleType(update.getResponsibleType());
                    if (update.getResponsibleType() == TransitionResponsibleType.SPECIFIC_MEMBER) {
                        if (update.getResponsibleUserId() == null) {
                            throw new InvalidRequestException(
                                    "Un membre responsable est requis pour une transition SPECIFIC_MEMBER.");
                        }
                        transition.setResponsibleUserId(update.getResponsibleUserId());
                    } else {
                        transition.setResponsibleUserId(null);
                    }
                }
                if (update.getAllowedRoles() != null) {
                    transition.setAllowedRoles(update.getAllowedRoles());
                }
                transitionRepository.save(transition);
            }
        }

        return WorkflowResponse.builder()
                .enforceWorkflowOrder(project.getEnforceWorkflowOrder())
                .statuses(statusMapper.parse(statusRepository.findByProjectIdOrderByPositionAsc(projectId)))
                .transitions(transitionMapper.parse(transitionRepository.findByFromStatusProjectId(projectId)))
                .build();
    }
}
