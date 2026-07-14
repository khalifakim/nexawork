package com.nexawork.project.services.impl;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.project.dtos.requests.CommentAttachmentRequest;
import com.nexawork.project.dtos.requests.CreateCommentRequest;
import com.nexawork.project.dtos.responses.CommentResponse;
import com.nexawork.project.entities.CommentAttachment;
import com.nexawork.project.entities.ProjectMember;
import com.nexawork.project.entities.Task;
import com.nexawork.project.entities.TaskComment;
import com.nexawork.project.events.publishers.ProjectEventPublisher;
import com.nexawork.project.events.publishers.TaskCommentedEvent;
import com.nexawork.project.mappers.CommentMapper;
import com.nexawork.project.repositories.ProjectMemberRepository;
import com.nexawork.project.repositories.TaskCommentRepository;
import com.nexawork.project.repositories.TaskRepository;
import com.nexawork.project.security.CallerContext;
import com.nexawork.project.security.ProjectGuard;
import com.nexawork.project.services.TaskCommentService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Commentaires de tâche (§13.2). R15 (participant) + REF E ; suppression réservée
 * à l'auteur ou à un administrateur.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TaskCommentServiceImpl implements TaskCommentService {

    TaskRepository taskRepository;
    TaskCommentRepository taskCommentRepository;
    ProjectMemberRepository projectMemberRepository;
    ProjectEventPublisher eventPublisher;
    CommentMapper commentMapper;
    ProjectGuard guard;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<CommentResponse> listComments(UUID taskId) {
        loadTaskAsParticipant(taskId);
        return commentMapper.parse(taskCommentRepository.findByTaskIdOrderByCreatedAtAsc(taskId));
    }

    @Override
    public CommentResponse addComment(UUID taskId, CreateCommentRequest request) {
        Task task = loadTaskAsParticipant(taskId);
        guard.assertActive(task.getProject());

        boolean hasContent = request.getContent() != null && !request.getContent().isBlank();
        boolean hasAttachments = request.getAttachments() != null && !request.getAttachments().isEmpty();
        if (!hasContent && !hasAttachments) {
            throw new InvalidRequestException("Un commentaire doit contenir du texte ou au moins un fichier.");
        }

        TaskComment comment = TaskComment.builder()
                .task(task)
                .authorUserId(caller.userId())
                .content(hasContent ? request.getContent() : "")
                .build();

        if (request.getAttachments() != null) {
            for (CommentAttachmentRequest att : request.getAttachments()) {
                comment.addAttachment(CommentAttachment.builder()
                        .fileName(att.getFileName())
                        .fileUrl(att.getFileUrl())
                        .fileSize(att.getFileSize())
                        .contentType(att.getContentType())
                        .build());
            }
        }

        TaskComment saved = taskCommentRepository.saveAndFlush(comment);

        // Notifie tous les membres du projet (hors auteur) — V5.1 §7.2.
        List<UUID> recipients = projectMemberRepository.findByProjectId(task.getProject().getId()).stream()
                .map(ProjectMember::getUserId)
                .filter(uid -> !uid.equals(caller.userId()))
                .distinct()
                .toList();
        if (!recipients.isEmpty()) {
            eventPublisher.publishTaskCommented(new TaskCommentedEvent(
                    task.getId(),
                    task.getTaskKey(),
                    task.getTitle(),
                    task.getProject().getId(),
                    task.getProject().getName(),
                    task.getProject().getOrganisationId(),
                    caller.userId(),
                    excerpt(saved.getContent()),
                    recipients));
        }
        return commentMapper.asDto(saved);
    }

    /** Extrait court du commentaire pour le corps de la notification. */
    private String excerpt(String content) {
        if (content == null || content.isBlank()) {
            return "A joint un fichier.";
        }
        String s = content.strip();
        return s.length() <= 120 ? s : s.substring(0, 117) + "…";
    }

    @Override
    public void deleteComment(UUID taskId, UUID commentId) {
        Task task = loadTaskAsParticipant(taskId);
        guard.assertActive(task.getProject());

        TaskComment comment = taskCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Commentaire introuvable."));
        if (!comment.getTask().getId().equals(taskId)) {
            throw new ResourceNotFoundException("Commentaire introuvable pour cette tâche.");
        }
        // §13.2 : « supprimer les siens » — auteur, ou administrateur du workspace.
        if (!comment.getAuthorUserId().equals(caller.userId()) && !caller.isWorkspaceAdmin()) {
            throw new ForbiddenException("Vous ne pouvez supprimer que vos propres commentaires.");
        }
        taskCommentRepository.delete(comment);
    }

    private Task loadTaskAsParticipant(UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tâche introuvable."));
        guard.participantProject(task.getProject().getId());
        return task;
    }
}
