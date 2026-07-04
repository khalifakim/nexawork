package com.nexawork.project.entities;

import com.nexawork.project.entities.enums.StatusCategory;
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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Colonne Kanban personnalisée d'un projet (V5.1 §4.2). Composition : cascade
 * avec le projet. La catégorie fixe (NOT_STARTED/ACTIVE/DONE/CLOSED) dérive
 * {@code isInitial} et {@code isFinal}.
 */
@Entity
@Table(name = "workflow_statuses")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private StatusCategory category;

    /** Ordre d'affichage gauche→droite. */
    @Column(name = "position", nullable = false)
    private Integer position;

    @Column(name = "is_initial", nullable = false)
    private Boolean isInitial;

    @Column(name = "is_final", nullable = false)
    private Boolean isFinal;

    @Column(name = "color", nullable = false, length = 50)
    private String color;
}
