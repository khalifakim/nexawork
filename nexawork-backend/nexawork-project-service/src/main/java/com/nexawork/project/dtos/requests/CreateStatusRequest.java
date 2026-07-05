package com.nexawork.project.dtos.requests;

import com.nexawork.project.entities.enums.StatusCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Ajout d'un statut Kanban (§8.2.1). La catégorie fixe détermine {@code isInitial}
 * (NOT_STARTED) et {@code isFinal} (DONE/CLOSED). Position optionnelle (append en fin).
 */
@Data
public class CreateStatusRequest {

    @NotBlank(message = "est obligatoire")
    private String name;

    @NotNull(message = "est obligatoire")
    private StatusCategory category;

    private String color;

    private Integer position;
}
