package com.nexawork.project.services;

import com.nexawork.project.dtos.requests.CreateStatusRequest;
import com.nexawork.project.dtos.requests.UpdateStatusRequest;
import com.nexawork.project.dtos.responses.StatusResponse;

import java.util.List;
import java.util.UUID;

/**
 * Statuts Kanban d'un projet (§8.2.1). Gestion réservée ADMIN+OWNER+chef de
 * projet (R8) ; refusée si projet archivé (REF E).
 */
public interface WorkflowStatusService {

    List<StatusResponse> listStatuses(UUID projectId);

    StatusResponse createStatus(UUID projectId, CreateStatusRequest request);

    StatusResponse updateStatus(UUID statusId, UpdateStatusRequest request);

    void deleteStatus(UUID statusId);
}
