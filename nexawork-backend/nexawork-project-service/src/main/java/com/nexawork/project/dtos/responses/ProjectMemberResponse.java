package com.nexawork.project.dtos.responses;

import com.nexawork.project.entities.enums.ProjectRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Membre d'un projet (§13.2). {@code teamName} est enrichi si le membre est
 * rattaché à une équipe.
 */
@Data
@Builder
public class ProjectMemberResponse {

    private UUID id;
    private UUID userId;
    private ProjectRole projectRole;
    private UUID teamId;
    private String teamName;
    private Boolean isProjectLead;
    private LocalDateTime joinedAt;
}
