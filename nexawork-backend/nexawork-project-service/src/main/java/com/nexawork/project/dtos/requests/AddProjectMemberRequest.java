package com.nexawork.project.dtos.requests;

import com.nexawork.project.entities.enums.ProjectRole;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

/**
 * Ajout d'un membre au projet (§13.2). Le rôle par défaut est PROJECT_MEMBER ;
 * l'équipe est optionnelle.
 */
@Data
public class AddProjectMemberRequest {

    @NotNull(message = "est obligatoire")
    private UUID userId;

    private ProjectRole projectRole;

    private UUID teamId;
}
