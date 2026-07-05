package com.nexawork.project.dtos.responses;

import com.nexawork.project.entities.enums.AssigneeType;
import com.nexawork.project.entities.enums.TaskPriority;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tâche renvoyée par l'API (§13.2). {@code statusName} et les compteurs sont
 * enrichis côté service.
 */
@Data
@Builder
public class TaskResponse {

    private UUID id;
    private UUID projectId;
    private String title;
    private String description;
    private UUID statusId;
    private String statusName;
    private TaskPriority priority;
    private AssigneeType assigneeType;
    private UUID assigneeId;
    private LocalDate startDate;
    private LocalDate dueDate;
    private String estimate;
    private Integer subtaskCount;
    private Integer commentCount;
    private Integer attachmentCount;
    private LocalDateTime createdDate;
}
