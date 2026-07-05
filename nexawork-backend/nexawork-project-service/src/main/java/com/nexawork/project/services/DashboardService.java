package com.nexawork.project.services;

import com.nexawork.project.dtos.responses.DashboardResponse;
import com.nexawork.project.dtos.responses.ProjectOverviewResponse;

import java.util.UUID;

/**
 * Agrégations de reporting (V5.1 §13.2, §5.2, §6.4.1) : tableau de bord global du
 * workspace (R1 : ADMIN+OWNER) et vue d'ensemble d'un projet (R15 : membre).
 * Toutes les valeurs sont calculées à la volée, non stockées.
 */
public interface DashboardService {

    DashboardResponse getWorkspaceDashboard(UUID workspaceId);

    ProjectOverviewResponse getProjectOverview(UUID projectId);
}
