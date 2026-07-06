package com.nexawork.project.entities;

import com.nexawork.commons.audits.Auditable;
import com.nexawork.project.entities.enums.ProjectStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Projet (V5.1 §4.2). Cycle de vie ACTIVE ⇄ ARCHIVED. Références logiques vers
 * Auth (organisationId = workspace, ownerUserId = chef de projet) sans FK.
 */
@Entity
@Table(name = "projects")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class Project extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    /** Préfixe court (ex. MOB) pour les {@code task_key} ; unique par workspace. */
    @Column(name = "prefix", nullable = false, length = 10)
    private String prefix;

    /** Dernier numéro de tâche attribué ; incrémenté à chaque création de tâche. */
    @Column(name = "task_sequence", nullable = false)
    private Integer taskSequence;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Couleur pastille du projet (palette). */
    @Column(name = "color", length = 50)
    private String color;

    @Column(name = "organisation_id", nullable = false)
    private UUID organisationId;

    @Column(name = "owner_user_id", nullable = false)
    private UUID ownerUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private ProjectStatus status;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    /** Impose l'ordre de passage des statuts Kanban (FSM strict). */
    @Column(name = "enforce_workflow_order", nullable = false)
    private Boolean enforceWorkflowOrder;
}
