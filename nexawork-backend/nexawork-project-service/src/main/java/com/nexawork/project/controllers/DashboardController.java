package com.nexawork.project.controllers;

import com.nexawork.commons.exceptions.NotImplementedException;
import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.responses.DashboardResponse;
import com.nexawork.project.services.DashboardService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Tableau de bord global d'un workspace (§13.2, §5.2) — réservé ADMIN+OWNER (R1,
 * 403 sinon). Le rapport PDF est différé (501).
 */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DashboardController {

    DashboardService dashboardService;

    @GetMapping("/dashboard")
    public Response<DashboardResponse> dashboard(@PathVariable UUID workspaceId) {
        return Response.<DashboardResponse>ok().setPayload(dashboardService.getWorkspaceDashboard(workspaceId));
    }

    @GetMapping("/report")
    public Response<Void> report(@PathVariable UUID workspaceId) {
        throw new NotImplementedException("La génération du rapport PDF du workspace n'est pas encore disponible.");
    }
}
