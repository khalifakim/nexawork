package com.nexawork.project.services.impl;

import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.project.dtos.requests.CreateAttachmentRequest;
import com.nexawork.project.dtos.responses.AttachmentResponse;
import com.nexawork.project.dtos.responses.TaskAttachmentAggregateResponse;
import com.nexawork.project.entities.Task;
import com.nexawork.project.entities.TaskAttachment;
import com.nexawork.project.mappers.AttachmentMapper;
import com.nexawork.project.repositories.TaskAttachmentRepository;
import com.nexawork.project.repositories.TaskRepository;
import com.nexawork.project.security.CallerContext;
import com.nexawork.project.security.ProjectGuard;
import com.nexawork.project.services.TaskAttachmentService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Pièces jointes de tâches (§13.2) + agrégat projet pour le GED (§10.5bis).
 * R15 (participant) + REF E.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TaskAttachmentServiceImpl implements TaskAttachmentService {

    TaskRepository taskRepository;
    TaskAttachmentRepository taskAttachmentRepository;
    AttachmentMapper attachmentMapper;
    ProjectGuard guard;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<AttachmentResponse> listAttachments(UUID taskId) {
        loadTaskAsParticipant(taskId);
        return attachmentMapper.parse(taskAttachmentRepository.findByTaskId(taskId));
    }

    @Override
    public AttachmentResponse addAttachment(UUID taskId, CreateAttachmentRequest request) {
        Task task = loadTaskAsParticipant(taskId);
        guard.assertActive(task.getProject());

        TaskAttachment attachment = taskAttachmentRepository.saveAndFlush(TaskAttachment.builder()
                .task(task)
                .fileName(request.getFileName())
                .fileUrl(request.getFileUrl())
                .fileSize(request.getFileSize())
                .contentType(request.getContentType())
                .uploadedByUserId(caller.userId())
                .build());
        return attachmentMapper.asDto(attachment);
    }

    @Override
    public void deleteAttachment(UUID taskId, UUID attachmentId) {
        Task task = loadTaskAsParticipant(taskId);
        guard.assertActive(task.getProject());

        TaskAttachment attachment = taskAttachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Pièce jointe introuvable."));
        if (!attachment.getTask().getId().equals(taskId)) {
            throw new ResourceNotFoundException("Pièce jointe introuvable pour cette tâche.");
        }
        taskAttachmentRepository.delete(attachment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskAttachmentAggregateResponse> listProjectAttachments(UUID projectId) {
        // Réservé aux membres du projet (403 sinon) — appelé en HTTP synchrone par le GED.
        guard.participantProject(projectId);
        return taskAttachmentRepository.findAggregateByProjectId(projectId).stream()
                .map(a -> TaskAttachmentAggregateResponse.builder()
                        .attachmentId(a.getId())
                        .taskId(a.getTask().getId())
                        .taskTitle(a.getTask().getTitle())
                        .fileName(a.getFileName())
                        .fileUrl(a.getFileUrl())
                        .fileSize(a.getFileSize())
                        .contentType(a.getContentType())
                        .uploadedByUserId(a.getUploadedByUserId())
                        .uploadedAt(a.getUploadedAt())
                        .build())
                .toList();
    }

    private Task loadTaskAsParticipant(UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tâche introuvable."));
        guard.participantProject(task.getProject().getId());
        return task;
    }
}
