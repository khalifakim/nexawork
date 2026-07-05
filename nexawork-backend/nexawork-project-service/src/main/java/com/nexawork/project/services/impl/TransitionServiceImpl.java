package com.nexawork.project.services.impl;

import com.nexawork.commons.exceptions.ConflictException;
import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.project.dtos.requests.CreateTransitionRequest;
import com.nexawork.project.dtos.responses.TransitionResponse;
import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.WorkflowStatus;
import com.nexawork.project.entities.WorkflowTransition;
import com.nexawork.project.entities.enums.TransitionResponsibleType;
import com.nexawork.project.mappers.TransitionMapper;
import com.nexawork.project.repositories.WorkflowStatusRepository;
import com.nexawork.project.repositories.WorkflowTransitionRepository;
import com.nexawork.project.security.ProjectGuard;
import com.nexawork.project.services.TransitionService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Transitions de workflow (§8.2.2). R8 (ADMIN+OWNER+chef de projet) + REF E.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TransitionServiceImpl implements TransitionService {

    WorkflowStatusRepository statusRepository;
    WorkflowTransitionRepository transitionRepository;
    TransitionMapper transitionMapper;
    ProjectGuard guard;

    @Override
    @Transactional(readOnly = true)
    public List<TransitionResponse> listTransitions(UUID projectId) {
        guard.loadInOrg(projectId);
        guard.requireProjectVisibility(projectId); // R15 : admin ou membre du projet
        return transitionMapper.parse(transitionRepository.findByFromStatusProjectId(projectId));
    }

    @Override
    public TransitionResponse createTransition(UUID projectId, CreateTransitionRequest request) {
        Project project = guard.loadInOrg(projectId);
        guard.assertActive(project);
        guard.requireProjectManager(project, "créer une transition");

        if (request.getFromStatusId().equals(request.getToStatusId())) {
            throw new InvalidRequestException("Une transition doit relier deux statuts distincts.");
        }
        WorkflowStatus from = requireStatusOfProject(request.getFromStatusId(), projectId);
        WorkflowStatus to = requireStatusOfProject(request.getToStatusId(), projectId);

        TransitionResponsibleType responsibleType = request.getResponsibleType() != null
                ? request.getResponsibleType()
                : TransitionResponsibleType.ALL;
        if (responsibleType == TransitionResponsibleType.SPECIFIC_MEMBER
                && request.getResponsibleUserId() == null) {
            throw new InvalidRequestException("Un membre responsable est requis pour une transition SPECIFIC_MEMBER.");
        }
        if (transitionRepository.existsByFromStatusIdAndToStatusId(from.getId(), to.getId())) {
            throw new ConflictException("Cette transition existe déjà.");
        }

        WorkflowTransition transition = WorkflowTransition.builder()
                .fromStatus(from)
                .toStatus(to)
                .responsibleType(responsibleType)
                .responsibleUserId(responsibleType == TransitionResponsibleType.SPECIFIC_MEMBER
                        ? request.getResponsibleUserId() : null)
                .allowedRoles(request.getAllowedRoles())
                .build();
        return transitionMapper.asDto(transitionRepository.save(transition));
    }

    private WorkflowStatus requireStatusOfProject(UUID statusId, UUID projectId) {
        WorkflowStatus status = statusRepository.findById(statusId)
                .orElseThrow(() -> new ResourceNotFoundException("Statut introuvable : " + statusId));
        if (!status.getProject().getId().equals(projectId)) {
            throw new InvalidRequestException("Le statut " + statusId + " n'appartient pas à ce projet.");
        }
        return status;
    }
}
