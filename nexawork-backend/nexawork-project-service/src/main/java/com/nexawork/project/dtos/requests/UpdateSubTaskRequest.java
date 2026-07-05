package com.nexawork.project.dtos.requests;

import lombok.Data;

import java.util.UUID;

/**
 * Mise à jour d'une sous-tâche (§13.2) : cocher/décocher, renommer, (ré)assigner.
 * Champs nuls = inchangés ; {@code clearAssignee=true} retire l'assigné.
 */
@Data
public class UpdateSubTaskRequest {

    private String title;

    private Boolean isCompleted;

    private UUID assigneeUserId;

    private Boolean clearAssignee;
}
