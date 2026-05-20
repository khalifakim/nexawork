package com.nexawork.project.dtos.requests;

import com.nexawork.project.entities.enums.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateTaskRequest(
    @NotBlank String title,
    String description,
    @NotNull Long statusId,
    TaskPriority priority,
    Long assigneeUserId,
    LocalDate dueDate
) {}
