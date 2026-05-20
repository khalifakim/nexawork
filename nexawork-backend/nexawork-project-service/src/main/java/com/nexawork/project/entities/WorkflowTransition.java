package com.nexawork.project.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "workflow_transitions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkflowTransition {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_status_id", nullable = false)
    private WorkflowStatus fromStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_status_id", nullable = false)
    private WorkflowStatus toStatus;
}
