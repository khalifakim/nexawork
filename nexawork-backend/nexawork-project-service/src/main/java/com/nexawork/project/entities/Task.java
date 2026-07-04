package com.nexawork.project.entities;

import com.nexawork.commons.audits.Auditable;
import com.nexawork.project.entities.enums.AssigneeType;
import com.nexawork.project.entities.enums.TaskPriority;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Tâche d'un projet (V5.1 §4.2). Statut Kanban courant (association nullable),
 * assignation polymorphe (assigneeType + assigneeId → User ou Team). Hérite de
 * l'audit ({@code createdDate} = date de création affichée).
 */
@Entity
@Table(name = "tasks")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class Task extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Statut Kanban courant (nullable — tâche non encore positionnée). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_id")
    private WorkflowStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 50)
    private TaskPriority priority;

    /** USER ou TEAM ; NULL ssi assigneeId NULL (CHECK). */
    @Enumerated(EnumType.STRING)
    @Column(name = "assignee_type", length = 10)
    private AssigneeType assigneeType;

    /** Réf. User ou Team selon {@code assigneeType}. */
    @Column(name = "assignee_id")
    private UUID assigneeId;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    /** Temps estimé (ex. « 3 h », « 2 j »). */
    @Column(name = "estimate", length = 50)
    private String estimate;
}
