package com.nexawork.project.dtos.requests;

import lombok.Data;

import java.time.LocalDate;

/**
 * Mise à jour partielle d'un projet (PATCH). Tous les champs sont optionnels ;
 * seuls les champs non nuls sont appliqués.
 */
@Data
public class UpdateProjectRequest {

    private String name;

    private String description;

    private String color;

    private LocalDate startDate;

    private LocalDate endDate;

    private Boolean enforceWorkflowOrder;
}
