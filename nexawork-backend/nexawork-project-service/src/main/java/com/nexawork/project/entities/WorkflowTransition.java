package com.nexawork.project.entities;

import com.nexawork.project.entities.enums.TransitionResponsibleType;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;
import java.util.UUID;

/**
 * Transition autorisée entre deux statuts et son responsable (V5.1 §4.2).
 * Implémente la machine à états du workflow (FSM Kanban). Le statut cible est
 * protégé contre la suppression (no-cascade côté SQL).
 */
@Entity
@Table(name = "workflow_transitions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowTransition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "from_status_id", nullable = false)
    private WorkflowStatus fromStatus;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "to_status_id", nullable = false)
    private WorkflowStatus toStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "responsible_type", nullable = false, length = 20)
    private TransitionResponsibleType responsibleType;

    /** Réf. logique User si {@code responsibleType = SPECIFIC_MEMBER}. */
    @Column(name = "responsible_user_id")
    private UUID responsibleUserId;

    /** Rôles autorisés (compatibilité multi-rôles) — stocké en JSONB. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "allowed_roles", columnDefinition = "jsonb")
    private List<String> allowedRoles;
}
