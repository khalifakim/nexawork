package com.nexawork.project.dtos.responses;

import com.nexawork.project.entities.enums.StatusCategory;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/**
 * Colonne Kanban (statut) — §8.2.1.
 */
@Data
@Builder
public class StatusResponse {

    private UUID id;
    private String name;
    private StatusCategory category;
    private Integer position;
    private Boolean isInitial;
    private Boolean isFinal;
    private String color;
}
