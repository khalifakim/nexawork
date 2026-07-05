package com.nexawork.project.dtos.requests;

import com.nexawork.project.entities.enums.TransitionResponsibleType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Création d'une transition de workflow (§8.2.2) : statut source → cible + son
 * responsable. {@code responsibleType} par défaut ALL.
 */
@Data
public class CreateTransitionRequest {

    @NotNull(message = "est obligatoire")
    private UUID fromStatusId;

    @NotNull(message = "est obligatoire")
    private UUID toStatusId;

    private TransitionResponsibleType responsibleType;

    /** Requis si {@code responsibleType = SPECIFIC_MEMBER}. */
    private UUID responsibleUserId;

    private List<String> allowedRoles;
}
