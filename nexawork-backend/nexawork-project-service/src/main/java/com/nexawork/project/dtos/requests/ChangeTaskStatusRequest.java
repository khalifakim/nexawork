package com.nexawork.project.dtos.requests;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

/**
 * Déplacement d'une tâche sur le Kanban (§10.2) : statut cible. Le service valide
 * la transition FSM (200 si autorisée, 422 sinon).
 */
@Data
public class ChangeTaskStatusRequest {

    @NotNull(message = "est obligatoire")
    private UUID toStatusId;
}
