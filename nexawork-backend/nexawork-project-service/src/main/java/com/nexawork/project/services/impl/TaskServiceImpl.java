package com.nexawork.project.services.impl;

import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.commons.exceptions.UnprocessableEntityException;
import com.nexawork.project.dtos.requests.ChangeTaskStatusRequest;
import com.nexawork.project.dtos.requests.CreateTaskRequest;
import com.nexawork.project.dtos.requests.UpdateTaskRequest;
import com.nexawork.project.dtos.responses.TaskResponse;
import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.Task;
import com.nexawork.project.entities.WorkflowStatus;
import com.nexawork.project.entities.WorkflowTransition;
import com.nexawork.project.entities.enums.AssigneeType;
import com.nexawork.project.entities.enums.TaskPriority;
import com.nexawork.project.entities.enums.TransitionResponsibleType;
import com.nexawork.project.events.publishers.LivrableValidatedEvent;
import com.nexawork.project.events.publishers.ProjectEventPublisher;
import com.nexawork.project.events.publishers.TaskAssignedEvent;
import com.nexawork.project.mappers.TaskMapper;
import com.nexawork.project.repositories.SubTaskRepository;
import com.nexawork.project.repositories.TaskAttachmentRepository;
import com.nexawork.project.repositories.TaskCommentRepository;
import com.nexawork.project.repositories.ProjectRepository;
import com.nexawork.project.repositories.TaskRepository;
import com.nexawork.project.repositories.TeamRepository;
import com.nexawork.project.repositories.WorkflowStatusRepository;
import com.nexawork.project.repositories.WorkflowTransitionRepository;
import com.nexawork.project.repositories.ProjectMemberRepository;
import com.nexawork.project.security.CallerContext;
import com.nexawork.project.security.ProjectGuard;
import com.nexawork.project.services.TaskService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Tâches (§13.2) + moteur FSM Kanban (§10.2). Publie {@code task.assigned} (à
 * l'assignation d'un utilisateur) et {@code livrable.validated} (au passage en
 * statut final).
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TaskServiceImpl implements TaskService {

    TaskRepository taskRepository;
    ProjectRepository projectRepository;
    WorkflowStatusRepository statusRepository;
    WorkflowTransitionRepository transitionRepository;
    TeamRepository teamRepository;
    ProjectMemberRepository projectMemberRepository;
    SubTaskRepository subTaskRepository;
    TaskCommentRepository taskCommentRepository;
    TaskAttachmentRepository taskAttachmentRepository;
    TaskMapper taskMapper;
    ProjectEventPublisher eventPublisher;
    ProjectGuard guard;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<TaskResponse> listTasks(UUID projectId) {
        guard.participantProject(projectId);
        return taskRepository.findByProjectId(projectId).stream().map(this::toDto).toList();
    }

    @Override
    public TaskResponse createTask(UUID projectId, CreateTaskRequest request) {
        Project project = guard.participantProject(projectId);
        guard.assertActive(project);

        validateAssignee(project, request.getAssigneeType(), request.getAssigneeId());
        WorkflowStatus status = resolveStatus(project, request.getStatusId());

        // task_key lisible : incrémente la séquence du projet (verrou pessimiste) → PREFIX-NNN.
        Project locked = projectRepository.findByIdForUpdate(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Projet introuvable."));
        int seq = (locked.getTaskSequence() == null ? 0 : locked.getTaskSequence()) + 1;
        locked.setTaskSequence(seq);
        String taskKey = locked.getPrefix() + "-" + seq;

        Task task = taskRepository.save(Task.builder()
                .project(locked)
                .taskKey(taskKey)
                .title(request.getTitle())
                .description(request.getDescription())
                .status(status)
                .priority(request.getPriority() != null ? request.getPriority() : TaskPriority.MEDIUM)
                .assigneeType(request.getAssigneeType())
                .assigneeId(request.getAssigneeId())
                .startDate(request.getStartDate())
                .dueDate(request.getDueDate())
                .estimate(request.getEstimate())
                .build());

        // task.assigned : uniquement pour une assignation à un utilisateur (§7.2).
        if (request.getAssigneeType() == AssigneeType.USER && request.getAssigneeId() != null) {
            publishTaskAssigned(task);
        }
        return toDto(task);
    }

    @Override
    @Transactional(readOnly = true)
    public TaskResponse getTask(UUID taskId) {
        Task task = loadTaskAsParticipant(taskId);
        return toDto(task);
    }

    @Override
    public TaskResponse updateTask(UUID taskId, UpdateTaskRequest request) {
        Task task = loadTaskAsParticipant(taskId);
        Project project = task.getProject();
        guard.assertActive(project);

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            task.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            task.setDescription(request.getDescription());
        }
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
        if (request.getStartDate() != null) {
            task.setStartDate(request.getStartDate());
        }
        if (request.getDueDate() != null) {
            task.setDueDate(request.getDueDate());
        }
        if (request.getEstimate() != null) {
            task.setEstimate(request.getEstimate());
        }

        boolean assigneeChanged = false;
        if (Boolean.TRUE.equals(request.getClearAssignee())) {
            task.setAssigneeType(null);
            task.setAssigneeId(null);
        } else if (request.getAssigneeType() != null || request.getAssigneeId() != null) {
            validateAssignee(project, request.getAssigneeType(), request.getAssigneeId());
            UUID previous = task.getAssigneeId();
            task.setAssigneeType(request.getAssigneeType());
            task.setAssigneeId(request.getAssigneeId());
            assigneeChanged = request.getAssigneeType() == AssigneeType.USER
                    && request.getAssigneeId() != null
                    && !request.getAssigneeId().equals(previous);
        }

        Task saved = taskRepository.save(task);
        if (assigneeChanged) {
            publishTaskAssigned(saved);
        }
        return toDto(saved);
    }

    @Override
    public void deleteTask(UUID taskId) {
        Task task = loadTaskAsParticipant(taskId);
        guard.assertActive(task.getProject());
        taskRepository.delete(task); // cascade DB : sous-tâches, commentaires, pièces jointes
    }

    @Override
    public TaskResponse changeStatus(UUID taskId, ChangeTaskStatusRequest request) {
        Task task = loadTaskAsParticipant(taskId);
        Project project = task.getProject();
        guard.assertActive(project);

        WorkflowStatus target = statusRepository.findById(request.getToStatusId())
                .orElseThrow(() -> new ResourceNotFoundException("Statut cible introuvable."));
        if (!target.getProject().getId().equals(project.getId())) {
            throw new UnprocessableEntityException("Le statut cible n'appartient pas au workflow de ce projet.");
        }

        WorkflowStatus current = task.getStatus();
        if (current != null && current.getId().equals(target.getId())) {
            return toDto(task); // aucun changement
        }

        // FSM : l'ordre imposé n'est vérifié que si le projet l'exige (§8.2.2) et
        // que la tâche est déjà positionnée (sinon placement initial libre).
        if (Boolean.TRUE.equals(project.getEnforceWorkflowOrder()) && current != null) {
            WorkflowTransition transition = transitionRepository
                    .findByFromStatusIdAndToStatusId(current.getId(), target.getId())
                    .orElseThrow(() -> new UnprocessableEntityException(
                            "Transition non autorisée : « " + current.getName() + " » → « " + target.getName() + " »."));
            if (!isResponsibleAllowed(transition, project)) {
                throw new UnprocessableEntityException(
                        "Vous n'êtes pas autorisé à effectuer cette transition de workflow.");
            }
        }

        task.setStatus(target);
        Task saved = taskRepository.save(task);

        if (Boolean.TRUE.equals(target.getIsFinal())) {
            eventPublisher.publishLivrableValidated(new LivrableValidatedEvent(
                    saved.getId(), saved.getTitle(), project.getId(), project.getName(),
                    caller.userId(),
                    saved.getAssigneeType() == AssigneeType.USER ? saved.getAssigneeId() : null));
        }
        return toDto(saved);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private Task loadTaskAsParticipant(UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tâche introuvable."));
        guard.participantProject(task.getProject().getId());
        return task;
    }

    /** Vérifie le responsable autorisé d'une transition (ALL / chef de projet / membre désigné). */
    private boolean isResponsibleAllowed(WorkflowTransition transition, Project project) {
        TransitionResponsibleType type = transition.getResponsibleType();
        if (type == null || type == TransitionResponsibleType.ALL) {
            return true;
        }
        UUID me = caller.userId();
        if (type == TransitionResponsibleType.PROJECT_LEAD) {
            return project.getOwnerUserId().equals(me);
        }
        // SPECIFIC_MEMBER
        return transition.getResponsibleUserId() != null && transition.getResponsibleUserId().equals(me);
    }

    /** Valide la cohérence de l'assignation polymorphe (§4.2). */
    private void validateAssignee(Project project, AssigneeType type, UUID assigneeId) {
        if (type == null && assigneeId == null) {
            return;
        }
        if (type == null || assigneeId == null) {
            throw new InvalidRequestException("assigneeType et assigneeId doivent être fournis ensemble.");
        }
        if (type == AssigneeType.TEAM) {
            teamRepository.findById(assigneeId)
                    .filter(team -> team.getProject().getId().equals(project.getId()))
                    .orElseThrow(() -> new InvalidRequestException("L'équipe assignée n'appartient pas à ce projet."));
        } else { // USER
            if (!projectMemberRepository.existsByProjectIdAndUserId(project.getId(), assigneeId)) {
                throw new InvalidRequestException("L'utilisateur assigné n'est pas membre du projet.");
            }
        }
    }

    private WorkflowStatus resolveStatus(Project project, UUID statusId) {
        if (statusId == null) {
            return null;
        }
        WorkflowStatus status = statusRepository.findById(statusId)
                .orElseThrow(() -> new ResourceNotFoundException("Statut introuvable."));
        if (!status.getProject().getId().equals(project.getId())) {
            throw new InvalidRequestException("Le statut n'appartient pas à ce projet.");
        }
        return status;
    }

    private void publishTaskAssigned(Task task) {
        eventPublisher.publishTaskAssigned(new TaskAssignedEvent(
                task.getId(), task.getTitle(),
                task.getProject().getId(), task.getProject().getName(),
                task.getAssigneeId(), caller.userId()));
    }

    private TaskResponse toDto(Task task) {
        TaskResponse dto = taskMapper.asDto(task);
        dto.setSubtaskCount((int) subTaskRepository.countByTaskId(task.getId()));
        dto.setCommentCount((int) taskCommentRepository.countByTaskId(task.getId()));
        dto.setAttachmentCount((int) taskAttachmentRepository.countByTaskId(task.getId()));
        return dto;
    }
}
