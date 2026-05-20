package com.nexawork.project.services;

import com.nexawork.project.dtos.requests.AddCommentRequest;
import com.nexawork.project.dtos.requests.CreateTaskRequest;
import com.nexawork.project.dtos.requests.MoveTaskRequest;
import com.nexawork.project.dtos.responses.TaskCommentResponse;
import com.nexawork.project.dtos.responses.TaskResponse;
import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.Task;
import com.nexawork.project.entities.TaskComment;
import com.nexawork.project.entities.WorkflowStatus;
import com.nexawork.project.entities.enums.TaskPriority;
import com.nexawork.project.events.publishers.LivrableValidatedEvent;
import com.nexawork.project.events.publishers.ProjectEventPublisher;
import com.nexawork.project.events.publishers.TaskAssignedEvent;
import com.nexawork.project.exceptions.ResourceNotFoundException;
import com.nexawork.project.repositories.ProjectRepository;
import com.nexawork.project.repositories.TaskCommentRepository;
import com.nexawork.project.repositories.TaskRepository;
import com.nexawork.project.repositories.WorkflowStatusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepo;
    private final ProjectRepository projectRepo;
    private final WorkflowStatusRepository statusRepo;
    private final TaskCommentRepository commentRepo;
    private final WorkflowFsmService fsmService;
    private final ProjectEventPublisher eventPublisher;

    @Transactional
    public TaskResponse create(Long projectId, CreateTaskRequest request, Long creatorUserId) {
        Project project = projectRepo.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Projet introuvable : " + projectId));

        WorkflowStatus status = statusRepo.findById(request.statusId())
            .orElseThrow(() -> new ResourceNotFoundException("Statut introuvable : " + request.statusId()));

        Task task = Task.builder()
            .project(project)
            .title(request.title())
            .description(request.description())
            .status(status)
            .priority(request.priority() != null ? request.priority() : TaskPriority.MEDIUM)
            .assigneeUserId(request.assigneeUserId())
            .dueDate(request.dueDate())
            .build();
        taskRepo.save(task);

        if (request.assigneeUserId() != null) {
            eventPublisher.publishTaskAssigned(new TaskAssignedEvent(
                task.getId(), task.getTitle(), projectId, project.getName(),
                request.assigneeUserId(), creatorUserId));
        }

        return toResponse(task);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> findByProject(Long projectId) {
        return taskRepo.findByProjectId(projectId).stream()
            .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TaskResponse findById(Long id) {
        return toResponse(getOrThrow(id));
    }

    @Transactional
    public TaskResponse move(Long taskId, MoveTaskRequest request, Long userId) {
        Task task = getOrThrow(taskId);
        WorkflowStatus targetStatus = statusRepo.findById(request.targetStatusId())
            .orElseThrow(() -> new ResourceNotFoundException("Statut cible introuvable"));

        fsmService.transition(task, request.targetStatusId());
        taskRepo.save(task);

        if (Boolean.TRUE.equals(targetStatus.getIsFinal()) && task.getAssigneeUserId() != null) {
            eventPublisher.publishLivrableValidated(new LivrableValidatedEvent(
                task.getId(), task.getTitle(), task.getProject().getId(),
                task.getProject().getName(), userId, task.getAssigneeUserId()));
        }

        return toResponse(task);
    }

    @Transactional
    public TaskCommentResponse addComment(Long taskId, AddCommentRequest request, Long authorUserId) {
        Task task = getOrThrow(taskId);
        TaskComment comment = TaskComment.builder()
            .task(task)
            .authorUserId(authorUserId)
            .content(request.content())
            .build();
        commentRepo.save(comment);
        return new TaskCommentResponse(
            comment.getId(), taskId, authorUserId, comment.getContent(), comment.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public List<TaskCommentResponse> getComments(Long taskId) {
        return commentRepo.findByTaskIdOrderByCreatedAtAsc(taskId).stream()
            .map(c -> new TaskCommentResponse(
                c.getId(), taskId, c.getAuthorUserId(), c.getContent(), c.getCreatedAt()))
            .collect(Collectors.toList());
    }

    private Task getOrThrow(Long id) {
        return taskRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Tâche introuvable : " + id));
    }

    private TaskResponse toResponse(Task t) {
        return new TaskResponse(
            t.getId(), t.getProject().getId(), t.getTitle(), t.getDescription(),
            t.getStatus() != null ? t.getStatus().getId() : null,
            t.getStatus() != null ? t.getStatus().getName() : null,
            t.getPriority(), t.getAssigneeUserId(), t.getDueDate(), t.getCreatedDate());
    }
}
