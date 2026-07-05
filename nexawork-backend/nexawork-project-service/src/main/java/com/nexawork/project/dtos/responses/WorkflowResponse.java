package com.nexawork.project.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Vue consolidée du workflow d'un projet (§8.2.2) : ordre imposé + statuts
 * ordonnés + transitions. Retournée après {@code PATCH /projects/{id}/workflow}.
 */
@Data
@Builder
public class WorkflowResponse {

    private Boolean enforceWorkflowOrder;
    private List<StatusResponse> statuses;
    private List<TransitionResponse> transitions;
}
