package com.nexawork.project.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.responses.ProjectOverviewResponse;
import com.nexawork.project.services.DashboardService;
import com.nexawork.project.services.ReportService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Vue d'ensemble d'un projet (§13.2, §6.4.1) — réservé aux membres du projet
 * (R15). Le rapport PDF projet (§17.2) est réservé au chef de projet et aux
 * administrateurs/propriétaires du workspace.
 */
@RestController
@RequestMapping("/api/v1/projects/{projectId}")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProjectOverviewController {

    DashboardService dashboardService;
    ReportService reportService;

    @GetMapping("/overview")
    public Response<ProjectOverviewResponse> overview(@PathVariable UUID projectId) {
        return Response.<ProjectOverviewResponse>ok().setPayload(dashboardService.getProjectOverview(projectId));
    }

    /** Rapport PDF du projet (§17.2) — téléchargement direct (pas d'enveloppe). */
    @GetMapping("/report")
    public ResponseEntity<byte[]> report(@PathVariable UUID projectId) {
        byte[] pdf = reportService.projectReport(projectId);
        return pdfResponse(pdf, "Rapport_projet");
    }

    static ResponseEntity<byte[]> pdfResponse(byte[] pdf, String prefix) {
        String filename = prefix + "_" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(pdf);
    }
}
