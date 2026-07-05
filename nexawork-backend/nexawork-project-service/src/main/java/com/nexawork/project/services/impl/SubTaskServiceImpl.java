package com.nexawork.project.services.impl;

import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.project.dtos.requests.CreateSubTaskRequest;
import com.nexawork.project.dtos.requests.UpdateSubTaskRequest;
import com.nexawork.project.dtos.responses.SubTaskResponse;
import com.nexawork.project.entities.SubTask;
import com.nexawork.project.entities.Task;
import com.nexawork.project.mappers.SubTaskMapper;
import com.nexawork.project.repositories.SubTaskRepository;
import com.nexawork.project.repositories.TaskRepository;
import com.nexawork.project.security.CallerContext;
import com.nexawork.project.security.ProjectGuard;
import com.nexawork.project.services.SubTaskService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Sous-tâches (§13.2). R15 (participant) + REF E.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SubTaskServiceImpl implements SubTaskService {

    TaskRepository taskRepository;
    SubTaskRepository subTaskRepository;
    SubTaskMapper subTaskMapper;
    ProjectGuard guard;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<SubTaskResponse> listSubTasks(UUID taskId) {
        loadTaskAsParticipant(taskId);
        return subTaskMapper.parse(subTaskRepository.findByTaskIdOrderByCreatedAtAsc(taskId));
    }

    @Override
    public SubTaskResponse addSubTask(UUID taskId, CreateSubTaskRequest request) {
        Task task = loadTaskAsParticipant(taskId);
        guard.assertActive(task.getProject());

        SubTask subTask = subTaskRepository.saveAndFlush(SubTask.builder()
                .task(task)
                .title(request.getTitle())
                .isCompleted(false)
                .assigneeUserId(request.getAssigneeUserId())
                .createdBy(caller.userId())
                .build());
        return subTaskMapper.asDto(subTask);
    }

    @Override
    public SubTaskResponse updateSubTask(UUID taskId, UUID subTaskId, UpdateSubTaskRequest request) {
        Task task = loadTaskAsParticipant(taskId);
        guard.assertActive(task.getProject());
        SubTask subTask = requireSubTaskOfTask(subTaskId, taskId);

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            subTask.setTitle(request.getTitle());
        }
        if (request.getIsCompleted() != null) {
            subTask.setIsCompleted(request.getIsCompleted());
        }
        if (Boolean.TRUE.equals(request.getClearAssignee())) {
            subTask.setAssigneeUserId(null);
        } else if (request.getAssigneeUserId() != null) {
            subTask.setAssigneeUserId(request.getAssigneeUserId());
        }
        return subTaskMapper.asDto(subTaskRepository.save(subTask));
    }

    @Override
    public void deleteSubTask(UUID taskId, UUID subTaskId) {
        Task task = loadTaskAsParticipant(taskId);
        guard.assertActive(task.getProject());
        SubTask subTask = requireSubTaskOfTask(subTaskId, taskId);
        subTaskRepository.delete(subTask);
    }

    private Task loadTaskAsParticipant(UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tâche introuvable."));
        guard.participantProject(task.getProject().getId());
        return task;
    }

    private SubTask requireSubTaskOfTask(UUID subTaskId, UUID taskId) {
        SubTask subTask = subTaskRepository.findById(subTaskId)
                .orElseThrow(() -> new ResourceNotFoundException("Sous-tâche introuvable."));
        if (!subTask.getTask().getId().equals(taskId)) {
            throw new ResourceNotFoundException("Sous-tâche introuvable pour cette tâche.");
        }
        return subTask;
    }
}
