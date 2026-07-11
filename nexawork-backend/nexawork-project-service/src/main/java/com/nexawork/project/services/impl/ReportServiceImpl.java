package com.nexawork.project.services.impl;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.project.dtos.responses.DashboardResponse;
import com.nexawork.project.dtos.responses.ProjectOverviewResponse;
import com.nexawork.project.dtos.responses.TaskResponse;
import com.nexawork.project.entities.Project;
import com.nexawork.project.security.CallerContext;
import com.nexawork.project.security.ProjectGuard;
import com.nexawork.project.services.DashboardService;
import com.nexawork.project.services.ReportService;
import com.nexawork.project.services.TaskService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * Génération PDF des rapports (§17) via OpenPDF. Réutilise les agrégations du
 * tableau de bord ({@link DashboardService}) et la liste des tâches, sans
 * recalculer de données ni introduire de nouvelle entité.
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReportServiceImpl implements ReportService {

    static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    static final Font TITLE = new Font(Font.HELVETICA, 20, Font.BOLD, new Color(0x2B, 0x2A, 0x35));
    static final Font SUBTITLE = new Font(Font.HELVETICA, 11, Font.NORMAL, new Color(0x86, 0x82, 0x8E));
    static final Font SECTION = new Font(Font.HELVETICA, 13, Font.BOLD, new Color(0x5B, 0x5F, 0xE9));
    static final Font TH = new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE);
    static final Font TD = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(0x33, 0x33, 0x33));
    static final Color HEADER_BG = new Color(0x5B, 0x5F, 0xE9);
    static final Color ROW_ALT = new Color(0xF5, 0xF4, 0xFB);

    DashboardService dashboardService;
    TaskService taskService;
    ProjectGuard guard;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public byte[] projectReport(UUID projectId) {
        Project project = guard.loadInOrg(projectId);
        guard.requireProjectManager(project, "générer le rapport du projet"); // §17.2

        ProjectOverviewResponse ov = dashboardService.getProjectOverview(projectId);
        List<TaskResponse> tasks = taskService.listTasks(projectId);

        return render(doc -> {
            header(doc, "Rapport de projet", ov.getName());

            section(doc, "Indicateurs clés");
            PdfPTable kpi = table(new float[]{1, 1, 1, 1});
            kpiHeader(kpi, "Avancement", "Terminées", "En retard", "Membres");
            kpiValues(kpi,
                    pct(ov.getProgress()),
                    nz(ov.getDoneTasks()) + "/" + nz(ov.getTotalTasks()),
                    String.valueOf(nz(ov.getOverdueTasks())),
                    String.valueOf(nz(ov.getMemberCount())));
            doc.add(kpi);

            section(doc, "Répartition par statut");
            PdfPTable rep = table(new float[]{2, 1});
            th(rep, "Statut"); th(rep, "Nombre");
            row(rep, false, "À faire", String.valueOf(nz(ov.getNotStartedTasks())));
            row(rep, true, "En cours", String.valueOf(nz(ov.getActiveTasks())));
            row(rep, false, "Terminées", String.valueOf(nz(ov.getDoneTasks())));
            row(rep, true, "Fermées", String.valueOf(nz(ov.getClosedTasks())));
            doc.add(rep);

            section(doc, "Tâches du projet (" + tasks.size() + ")");
            PdfPTable tt = table(new float[]{1.1f, 3f, 1.4f, 1.1f, 1.2f});
            th(tt, "Clé"); th(tt, "Titre"); th(tt, "Statut"); th(tt, "Priorité"); th(tt, "Échéance");
            boolean alt = false;
            for (TaskResponse t : tasks) {
                row(tt, alt,
                        safe(t.getTaskKey()),
                        safe(t.getTitle()),
                        safe(t.getStatusName()),
                        t.getPriority() != null ? t.getPriority().name() : "—",
                        t.getDueDate() != null ? t.getDueDate().format(DATE) : "—");
                alt = !alt;
            }
            doc.add(tt);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] workspaceReport(UUID workspaceId) {
        caller.requireWorkspaceAdmin("générer le rapport du workspace"); // R1
        DashboardResponse dash = dashboardService.getWorkspaceDashboard(workspaceId);
        DashboardResponse.Kpis k = dash.getKpis();

        return render(doc -> {
            header(doc, "Rapport global du workspace", "Vue d'ensemble de l'activité");

            section(doc, "Indicateurs clés");
            PdfPTable kpi = table(new float[]{1, 1, 1, 1});
            kpiHeader(kpi, "Projets actifs", "Tâches en cours", "Tâches en retard", "Membres");
            kpiValues(kpi,
                    String.valueOf(nz(k.getActiveProjects())),
                    String.valueOf(nz(k.getInProgressTasks())),
                    String.valueOf(nz(k.getOverdueTasks())),
                    String.valueOf(nz(k.getWorkspaceMembers())));
            doc.add(kpi);

            section(doc, "Projets (" + dash.getActiveProjectsList().size() + ")");
            PdfPTable pt = table(new float[]{2.6f, 1f, 1.2f, 1.4f});
            th(pt, "Projet"); th(pt, "Avancement"); th(pt, "Santé"); th(pt, "Échéance");
            boolean alt = false;
            for (DashboardResponse.DashboardProject p : dash.getActiveProjectsList()) {
                row(pt, alt,
                        safe(p.getName()),
                        pct(p.getProgress()),
                        health(p.getHealth()),
                        p.getEndDate() != null ? p.getEndDate().format(DATE) : "—");
                alt = !alt;
            }
            doc.add(pt);

            if (!dash.getWorkload().isEmpty()) {
                section(doc, "Charge par projet");
                PdfPTable wt = table(new float[]{3f, 1.2f});
                th(wt, "Projet"); th(wt, "Tâches actives");
                alt = false;
                for (DashboardResponse.WorkloadEntry w : dash.getWorkload()) {
                    row(wt, alt, safe(w.getProjectName()), String.valueOf(nz(w.getActiveTaskCount())));
                    alt = !alt;
                }
                doc.add(wt);
            }

            if (!dash.getAlerts().isEmpty()) {
                section(doc, "Alertes");
                PdfPTable at = table(new float[]{1.3f, 4f});
                th(at, "Sévérité"); th(at, "Message");
                alt = false;
                for (DashboardResponse.DashboardAlert a : dash.getAlerts()) {
                    row(at, alt, safe(a.getSeverity()), safe(a.getMessage()));
                    alt = !alt;
                }
                doc.add(at);
            }
        });
    }

    // ── Rendu commun ─────────────────────────────────────────────────────────

    /** Fonctionnelle : reçoit un document ouvert, y ajoute le contenu du rapport. */
    private interface Body {
        void write(Document doc);
    }

    private byte[] render(Body body) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 42, 42, 48, 42);
            PdfWriter.getInstance(doc, out);
            doc.open();
            body.write(doc);
            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new InvalidRequestException("Échec de la génération du rapport PDF : " + e.getMessage());
        }
    }

    private void header(Document doc, String title, String subtitle) {
        Paragraph t = new Paragraph(title, TITLE);
        t.setSpacingAfter(2f);
        doc.add(t);
        doc.add(new Paragraph(subtitle, SUBTITLE));
        Paragraph gen = new Paragraph("Généré le " + LocalDateTime.now().format(DATE) + " — NexaWork", SUBTITLE);
        gen.setSpacingAfter(14f);
        doc.add(gen);
    }

    private void section(Document doc, String label) {
        Paragraph s = new Paragraph(label, SECTION);
        s.setSpacingBefore(14f);
        s.setSpacingAfter(6f);
        doc.add(s);
    }

    private PdfPTable table(float[] widths) {
        PdfPTable table = new PdfPTable(widths.length);
        table.setWidthPercentage(100);
        try {
            table.setWidths(widths);
        } catch (Exception ignored) {
            // largeurs invalides : OpenPDF répartit uniformément.
        }
        return table;
    }

    private void th(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, TH));
        cell.setBackgroundColor(HEADER_BG);
        cell.setPadding(6f);
        cell.setBorderColor(Color.WHITE);
        table.addCell(cell);
    }

    private void row(PdfPTable table, boolean alt, String... cells) {
        for (String c : cells) {
            PdfPCell cell = new PdfPCell(new Phrase(c, TD));
            cell.setPadding(5f);
            cell.setBorderColor(new Color(0xE2, 0xDF, 0xD8));
            if (alt) {
                cell.setBackgroundColor(ROW_ALT);
            }
            table.addCell(cell);
        }
    }

    private void kpiHeader(PdfPTable table, String... labels) {
        for (String l : labels) {
            th(table, l);
        }
    }

    private void kpiValues(PdfPTable table, String... values) {
        Font big = new Font(Font.HELVETICA, 15, Font.BOLD, new Color(0x2B, 0x2A, 0x35));
        for (String v : values) {
            PdfPCell cell = new PdfPCell(new Phrase(v, big));
            cell.setPadding(8f);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setBorderColor(new Color(0xE2, 0xDF, 0xD8));
            table.addCell(cell);
        }
    }

    // ── Formatage ────────────────────────────────────────────────────────────
    private int nz(Integer v) { return v == null ? 0 : v; }
    private String pct(Integer v) { return nz(v) + " %"; }
    private String safe(String v) { return v == null ? "—" : v; }

    private String health(String h) {
        if (h == null) return "—";
        return switch (h.toUpperCase()) {
            case "CRITIQUE" -> "Critique";
            case "A_SURVEILLER" -> "À surveiller";
            default -> "En bonne voie";
        };
    }
}
