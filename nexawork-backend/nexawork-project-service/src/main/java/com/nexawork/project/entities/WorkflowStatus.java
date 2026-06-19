package com.nexawork.project.entities;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workflow_statuses")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkflowStatus {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer position;

    @Builder.Default
    private Boolean isFinal = false;

    @Builder.Default
    private Boolean isInitial = false;

    @Column(nullable = false)
    @Builder.Default
    private String color = "#6c757d";

    @OneToMany(mappedBy = "fromStatus", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<WorkflowTransition> outgoingTransitions = new ArrayList<>();
}
