package com.nexawork.project.dtos.responses;

import com.nexawork.project.entities.enums.TaskPriority;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record TaskResponse(
    Long id,
    Long projectId,
    String title,
    String description,
    Long statusId,
    String statusName,
    TaskPriority priority,
    Long assigneeUserId,
    LocalDate dueDate,
    LocalDateTime createdDate
) {}
