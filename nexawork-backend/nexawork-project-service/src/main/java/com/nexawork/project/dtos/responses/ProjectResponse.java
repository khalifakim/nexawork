package com.nexawork.project.dtos.responses;

import com.nexawork.project.entities.enums.ProjectStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Représentation d'un projet renvoyée par l'API (§13.2). {@code memberCount} est
 * enrichi côté service. L'« état » (santé) affiché est calculé côté client, non
 * porté ici (V5.1 §4.2).
 */
@Data
@Builder
public class ProjectResponse {

    private UUID id;
    private String name;
    private String description;
    private String color;
    private UUID organisationId;
    private UUID ownerUserId;
    private ProjectStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean enforceWorkflowOrder;
    private Integer memberCount;
    private LocalDateTime createdDate;
}
