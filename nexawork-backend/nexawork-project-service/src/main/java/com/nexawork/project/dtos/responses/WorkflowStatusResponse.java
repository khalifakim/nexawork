package com.nexawork.project.dtos.responses;

public record WorkflowStatusResponse(
    Long id,
    Long projectId,
    String name,
    Integer position,
    Boolean isFinal
) {}
