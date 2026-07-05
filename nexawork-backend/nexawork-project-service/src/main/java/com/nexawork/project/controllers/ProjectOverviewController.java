package com.nexawork.project.controllers;

import com.nexawork.commons.exceptions.NotImplementedException;
import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.responses.ProjectOverviewResponse;
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
 * Vue d'ensemble d'un projet (§13.2, §6.4.1) — réservé aux membres du projet
 * (R15). Le rapport PDF projet est différé (501).
 */
@RestController
@RequestMapping("/api/v1/projects/{projectId}")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProjectOverviewController {

    DashboardService dashboardService;

    @GetMapping("/overview")
    public Response<ProjectOverviewResponse> overview(@PathVariable UUID projectId) {
        return Response.<ProjectOverviewResponse>ok().setPayload(dashboardService.getProjectOverview(projectId));
    }

    @GetMapping("/report")
    public Response<Void> report(@PathVariable UUID projectId) {
        throw new NotImplementedException("La génération du rapport PDF du projet n'est pas encore disponible.");
    }
}
