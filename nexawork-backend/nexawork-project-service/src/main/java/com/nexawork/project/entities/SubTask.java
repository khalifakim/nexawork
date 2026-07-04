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
 * Sous-tâche cochable d'une tâche (V5.1 §4.2). Composition : cascade avec la
 * tâche parente.
 */
@Entity
@Table(name = "sub_tasks")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubTask {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "is_completed", nullable = false)
    private Boolean isCompleted;

    /** Réf. logique User assigné à la sous-tâche (optionnel). */
    @Column(name = "assignee_user_id")
    private UUID assigneeUserId;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
