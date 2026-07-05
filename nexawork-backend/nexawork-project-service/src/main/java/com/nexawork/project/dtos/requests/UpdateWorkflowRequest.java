package com.nexawork.project.dtos.requests;

import com.nexawork.project.entities.enums.TransitionResponsibleType;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Configuration du workflow (§8.2.2) : bascule « imposer l'ordre de passage » et
 * mise à jour groupée des responsables de transitions existantes. Champs nuls =
 * inchangés.
 */
@Data
public class UpdateWorkflowRequest {

    private Boolean enforceWorkflowOrder;

    private List<TransitionResponsibleUpdate> transitions;

    /**
     * Responsable d'une transition identifiée par son id.
     */
    @Data
    public static class TransitionResponsibleUpdate {
        private UUID transitionId;
        private TransitionResponsibleType responsibleType;
        private UUID responsibleUserId;
        private List<String> allowedRoles;
    }
}
