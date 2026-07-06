package com.nexawork.project.dtos.requests;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

/**
 * Mise à jour partielle d'un projet (PATCH). Tous les champs sont optionnels ;
 * seuls les champs non nuls sont appliqués.
 */
@Data
public class UpdateProjectRequest {

    private String name;

    /** Nouveau préfixe des task_key (unique par workspace). Les task_key existantes ne changent pas. */
    @Size(max = 10)
    @Pattern(regexp = "^[A-Za-z0-9]*$", message = "préfixe alphanumérique attendu")
    private String prefix;

    private String description;

    private String color;

    private LocalDate startDate;

    private LocalDate endDate;

    private Boolean enforceWorkflowOrder;
}
