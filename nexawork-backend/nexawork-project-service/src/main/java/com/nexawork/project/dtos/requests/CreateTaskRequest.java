package com.nexawork.project.dtos.requests;

import com.nexawork.project.entities.enums.AssigneeType;
import com.nexawork.project.entities.enums.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Création d'une tâche (§13.2, §7.2). Priorité par défaut MEDIUM. Assignation
 * polymorphe optionnelle : {@code assigneeType} + {@code assigneeId} (les deux
 * ensemble ou aucun). {@code statusId} optionnel (positionnement initial).
 */
@Data
public class CreateTaskRequest {

    @NotBlank(message = "est obligatoire")
    private String title;

    private String description;

    private TaskPriority priority;

    private AssigneeType assigneeType;

    private UUID assigneeId;

    private UUID statusId;

    private LocalDate startDate;

    private LocalDate dueDate;

    private String estimate;
}
