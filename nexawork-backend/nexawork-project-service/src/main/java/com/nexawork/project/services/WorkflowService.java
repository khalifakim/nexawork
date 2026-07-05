package com.nexawork.project.services;

import com.nexawork.project.dtos.requests.UpdateWorkflowRequest;
import com.nexawork.project.dtos.responses.WorkflowResponse;

import java.util.UUID;

/**
 * Configuration du workflow d'un projet (§8.2.2) : ordre imposé + responsables de
 * transitions. Réservée ADMIN+OWNER+chef de projet (R8) ; refusée si archivé (REF E).
 */
public interface WorkflowService {

    WorkflowResponse updateWorkflow(UUID projectId, UpdateWorkflowRequest request);
}
