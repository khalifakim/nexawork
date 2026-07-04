package com.nexawork.auth.services;

import com.nexawork.auth.dtos.requests.CreateWorkspaceRequest;
import com.nexawork.auth.dtos.requests.UpdateWorkspaceRequest;
import com.nexawork.auth.dtos.responses.WorkspaceResponse;

import java.util.List;
import java.util.UUID;

/**
 * Workspaces (§13.1) : création REF I (pas de bascule auto), suppression
 * REF H (OWNER seul + propagation déconnexion).
 */
public interface WorkspaceService {

    List<WorkspaceResponse> listMine();

    WorkspaceResponse create(CreateWorkspaceRequest request);

    WorkspaceResponse get(UUID workspaceId);

    WorkspaceResponse update(UUID workspaceId, UpdateWorkspaceRequest request);

    void delete(UUID workspaceId);
}
