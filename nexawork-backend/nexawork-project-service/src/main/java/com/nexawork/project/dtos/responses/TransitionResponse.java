package com.nexawork.project.dtos.responses;

import com.nexawork.project.entities.enums.TransitionResponsibleType;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Transition de workflow (§8.2.2), enrichie des libellés de statuts source/cible.
 */
@Data
@Builder
public class TransitionResponse {

    private UUID id;
    private UUID fromStatusId;
    private String fromStatusName;
    private UUID toStatusId;
    private String toStatusName;
    private TransitionResponsibleType responsibleType;
    private UUID responsibleUserId;
    private List<String> allowedRoles;
}
