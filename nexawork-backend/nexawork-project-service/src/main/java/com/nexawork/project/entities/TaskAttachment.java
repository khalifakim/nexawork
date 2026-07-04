package com.nexawork.project.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Pièce jointe d'une tâche (V5.1 §4.2). La référence physique est gérée par le
 * File Service ({@code fileUrl} = URL présignée MinIO). Consultée par le GED via
 * l'endpoint synchrone {@code /projects/{id}/task-attachments} (§10.5bis) —
 * jamais copiée en base GED.
 */
@Entity
@Table(name = "task_attachments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_url", nullable = false, length = 1024)
    private String fileUrl;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "uploaded_by_user_id", nullable = false)
    private UUID uploadedByUserId;

    @CreationTimestamp
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private LocalDateTime uploadedAt;
}
