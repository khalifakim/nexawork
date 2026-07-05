package com.nexawork.project.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

/**
 * Ajout d'une sous-tâche (§13.2). Assigné optionnel.
 */
@Data
public class CreateSubTaskRequest {

    @NotBlank(message = "est obligatoire")
    private String title;

    private UUID assigneeUserId;
}
