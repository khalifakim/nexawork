package com.nexawork.project.dtos.requests;

import com.nexawork.project.entities.enums.AssigneeType;
import com.nexawork.project.entities.enums.TaskPriority;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Mise à jour partielle d'une tâche (PATCH). Champs nuls = inchangés.
 * {@code clearAssignee=true} désassigne la tâche ; sinon {@code assigneeType} +
 * {@code assigneeId} réassignent. Le changement de statut passe par l'endpoint
 * dédié {@code PATCH /tasks/{id}/status} (FSM), pas par ici.
 */
@Data
public class UpdateTaskRequest {

    private String title;

    private String description;

    private TaskPriority priority;

    private AssigneeType assigneeType;

    private UUID assigneeId;

    private Boolean clearAssignee;

    private LocalDate startDate;

    private LocalDate dueDate;

    private String estimate;
}
