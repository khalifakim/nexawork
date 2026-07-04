package com.nexawork.project.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Équipe interne d'un projet (§13.2, §10).
 */
@Data
@Builder
public class TeamResponse {

    private UUID id;
    private String name;
    private String color;
    private LocalDateTime createdAt;
}
