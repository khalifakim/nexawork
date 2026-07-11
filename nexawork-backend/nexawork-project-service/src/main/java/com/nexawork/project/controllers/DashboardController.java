package com.nexawork.project.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.responses.DashboardResponse;
import com.nexawork.project.services.DashboardService;
import com.nexawork.project.services.ReportService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Tableau de bord global d'un workspace (§13.2, §5.2) — réservé ADMIN+OWNER (R1,
 * 403 sinon). Le rapport PDF global (§17.1) est soumis aux mêmes droits.
 */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DashboardController {

    DashboardService dashboardService;
    ReportService reportService;

    @GetMapping("/dashboard")
    public Response<DashboardResponse> dashboard(@PathVariable UUID workspaceId) {
        return Response.<DashboardResponse>ok().setPayload(dashboardService.getWorkspaceDashboard(workspaceId));
    }

    /** Rapport PDF global du workspace (§17.1) — téléchargement direct. */
    @GetMapping("/report")
    public ResponseEntity<byte[]> report(@PathVariable UUID workspaceId) {
        byte[] pdf = reportService.workspaceReport(workspaceId);
        return ProjectOverviewController.pdfResponse(pdf, "Rapport_global");
    }
}
