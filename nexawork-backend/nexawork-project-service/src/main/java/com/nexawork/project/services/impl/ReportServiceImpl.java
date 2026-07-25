package com.nexawork.project.services.impl;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;
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
    public byte[] projectReport(UUID projectId, String workspaceName) {
        Project project = guard.loadInOrg(projectId);
        guard.requireProjectManager(project, "générer le rapport du projet"); // §17.2

        ProjectOverviewResponse ov = dashboardService.getProjectOverview(projectId);
        List<TaskResponse> tasks = taskService.listTasks(projectId);

        return render(doc -> {
            header(doc, "Rapport de projet", ov.getName(), workspaceName);

            section(doc, "Indicateurs clés");
            PdfPTable kpi = table(new float[]{1, 1, 1, 1});
            kpiTiles(kpi,
                    new String[]{"Avancement", "Terminées", "En retard", "Membres"},
                    new String[]{
                            pct(ov.getProgress()),
                            nz(ov.getDoneTasks()) + "/" + nz(ov.getTotalTasks()),
                            String.valueOf(nz(ov.getOverdueTasks())),
                            String.valueOf(nz(ov.getMemberCount()))});
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
    public byte[] workspaceReport(UUID workspaceId, String workspaceName) {
        caller.requireWorkspaceAdmin("générer le rapport du workspace"); // R1
        DashboardResponse dash = dashboardService.getWorkspaceDashboard(workspaceId);
        DashboardResponse.Kpis k = dash.getKpis();

        String subtitle = (workspaceName != null && !workspaceName.isBlank())
                ? workspaceName
                : "Vue d'ensemble de l'activité";

        return render(doc -> {
            // Le nom du workspace est déjà porté par le sous-titre → pas de
            // répétition dans la ligne « Généré le… » (workspaceName = null).
            header(doc, "Rapport global du workspace", subtitle, null);

            section(doc, "Indicateurs clés");
            PdfPTable kpi = table(new float[]{1, 1, 1, 1});
            kpiTiles(kpi,
                    new String[]{"Projets actifs", "Tâches en cours", "Tâches en retard", "Membres"},
                    new String[]{
                            String.valueOf(nz(k.getActiveProjects())),
                            String.valueOf(nz(k.getInProgressTasks())),
                            String.valueOf(nz(k.getOverdueTasks())),
                            String.valueOf(nz(k.getWorkspaceMembers()))});
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
                section(doc, "Charge de travail par projet");
                int max = dash.getWorkload().stream()
                        .mapToInt(w -> nz(w.getActiveTaskCount()))
                        .max().orElse(0);
                PdfPTable wt = table(new float[]{2.2f, 3f, 0.9f});
                th(wt, "Projet"); th(wt, "Charge"); th(wt, "Tâches actives");
                alt = false;
                for (DashboardResponse.WorkloadEntry w : dash.getWorkload()) {
                    cellText(wt, safe(w.getProjectName()), alt);
                    wt.addCell(barCell(nz(w.getActiveTaskCount()), max, color(w.getColor()), alt));
                    cellText(wt, String.valueOf(nz(w.getActiveTaskCount())), alt);
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
            // Marge basse plus grande pour laisser respirer le pied de page paginé.
            Document doc = new Document(PageSize.A4, 42, 42, 48, 54);
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPageEvent(new FooterEvent());
            doc.open();
            body.write(doc);
            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new InvalidRequestException("Échec de la génération du rapport PDF : " + e.getMessage());
        }
    }

    /** Pied de page sur chaque page : filet fin + marque à gauche, pagination à droite. */
    static final class FooterEvent extends PdfPageEventHelper {
        private static final Font FOOT = new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(0x9B, 0x97, 0xA3));

        @Override
        public void onEndPage(PdfWriter writer, Document doc) {
            Rectangle page = doc.getPageSize();
            PdfContentByte cb = writer.getDirectContent();
            float y = doc.bottomMargin() - 14;
            cb.setColorStroke(new Color(0xE2, 0xDF, 0xD8));
            cb.setLineWidth(0.6f);
            cb.moveTo(doc.leftMargin(), y);
            cb.lineTo(page.getWidth() - doc.rightMargin(), y);
            cb.stroke();
            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT,
                    new Phrase("NexaWork — Rapport confidentiel", FOOT),
                    doc.leftMargin(), y - 11, 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT,
                    new Phrase("Page " + writer.getPageNumber(), FOOT),
                    page.getWidth() - doc.rightMargin(), y - 11, 0);
        }
    }

    private void header(Document doc, String title, String subtitle, String workspaceName) {
        brandHeader(doc);
        Paragraph t = new Paragraph(title, TITLE);
        t.setSpacingAfter(2f);
        doc.add(t);
        if (subtitle != null && !subtitle.isBlank()) {
            doc.add(new Paragraph(subtitle, SUBTITLE));
        }
        StringBuilder meta = new StringBuilder();
        if (workspaceName != null && !workspaceName.isBlank()) {
            meta.append("Espace de travail : ").append(workspaceName).append("  ·  ");
        }
        meta.append("Généré le ").append(LocalDateTime.now().format(DATE));
        Paragraph gen = new Paragraph(meta.toString(), SUBTITLE);
        gen.setSpacingAfter(8f);
        doc.add(gen);
        // Filet fin de séparation sous l'en-tête.
        Paragraph rule = new Paragraph(new Chunk(
                new LineSeparator(0.8f, 100, new Color(0xE2, 0xDF, 0xD8), Element.ALIGN_CENTER, -2)));
        rule.setSpacingAfter(12f);
        doc.add(rule);
    }

    /** Bandeau de marque NexaWork (mark indigo + « NexaWork ») en haut du rapport. */
    private void brandHeader(Document doc) {
        PdfPTable lock = new PdfPTable(new float[]{24, 470});
        lock.setWidthPercentage(100);
        lock.setSpacingAfter(10f);

        // Marque : petit carré indigo avec un « N » blanc.
        PdfPCell mark = new PdfPCell(new Phrase("N", new Font(Font.HELVETICA, 13, Font.BOLD, Color.WHITE)));
        mark.setBackgroundColor(HEADER_BG);
        mark.setHorizontalAlignment(Element.ALIGN_CENTER);
        mark.setVerticalAlignment(Element.ALIGN_MIDDLE);
        mark.setFixedHeight(22f);
        mark.setBorder(0);
        lock.addCell(mark);

        // Mot-symbole : « Nexa » (sombre) + « Work » (indigo).
        Phrase wm = new Phrase();
        wm.add(new Chunk("Nexa", new Font(Font.HELVETICA, 15, Font.BOLD, new Color(0x2B, 0x2A, 0x35))));
        wm.add(new Chunk("Work", new Font(Font.HELVETICA, 15, Font.BOLD, HEADER_BG)));
        PdfPCell word = new PdfPCell(wm);
        word.setBorder(0);
        word.setPaddingLeft(9f);
        word.setVerticalAlignment(Element.ALIGN_MIDDLE);
        lock.addCell(word);

        doc.add(lock);
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

    /** Une cellule de texte isolée (pour composer des lignes hétérogènes). */
    private void cellText(PdfPTable table, String text, boolean alt) {
        PdfPCell cell = new PdfPCell(new Phrase(text, TD));
        cell.setPadding(5f);
        cell.setBorderColor(new Color(0xE2, 0xDF, 0xD8));
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        if (alt) {
            cell.setBackgroundColor(ROW_ALT);
        }
        table.addCell(cell);
    }

    /**
     * Barre de charge proportionnelle (comme le tableau de bord) : un rectangle
     * coloré dont la largeur reflète le nombre de tâches actives, normalisé sur
     * le projet le plus chargé.
     */
    private PdfPCell barCell(int count, int max, Color barColor, boolean alt) {
        float ratio = max <= 0 ? 0f : Math.min(1f, (float) count / (float) max);
        int filled = Math.max(2, Math.round(ratio * 100)); // largeur minimale visible
        int empty = Math.max(0, 100 - filled);

        PdfPTable bar = new PdfPTable(empty > 0 ? 2 : 1);
        bar.setWidthPercentage(100);
        try {
            bar.setWidths(empty > 0 ? new float[]{filled, empty} : new float[]{filled});
        } catch (Exception ignored) {
            // largeurs invalides : OpenPDF répartit uniformément.
        }
        PdfPCell fill = new PdfPCell();
        fill.setBackgroundColor(barColor);
        fill.setFixedHeight(11f);
        fill.setBorder(0);
        bar.addCell(fill);
        if (empty > 0) {
            PdfPCell rest = new PdfPCell();
            rest.setBorder(0);
            bar.addCell(rest);
        }

        PdfPCell wrapper = new PdfPCell(bar);
        wrapper.setPadding(5f);
        wrapper.setBorderColor(new Color(0xE2, 0xDF, 0xD8));
        wrapper.setVerticalAlignment(Element.ALIGN_MIDDLE);
        if (alt) {
            wrapper.setBackgroundColor(ROW_ALT);
        }
        return wrapper;
    }

    /** Parse une couleur hexadécimale (#RRGGBB) ; repli sur l'indigo de marque. */
    private Color color(String hex) {
        if (hex == null) {
            return HEADER_BG;
        }
        try {
            String h = hex.startsWith("#") ? hex.substring(1) : hex;
            return new Color(
                    Integer.parseInt(h.substring(0, 2), 16),
                    Integer.parseInt(h.substring(2, 4), 16),
                    Integer.parseInt(h.substring(4, 6), 16));
        } catch (Exception e) {
            return HEADER_BG;
        }
    }

    /**
     * KPI en tuiles : chaque cellule porte un intitulé (petit, gris) au-dessus d'une
     * grande valeur, sur fond clair — lecture « tableau de bord » plutôt que tableau brut.
     */
    private void kpiTiles(PdfPTable table, String[] labels, String[] values) {
        Font lab = new Font(Font.HELVETICA, 8, Font.BOLD, new Color(0x86, 0x82, 0x8E));
        Font big = new Font(Font.HELVETICA, 17, Font.BOLD, new Color(0x2B, 0x2A, 0x35));
        for (int i = 0; i < labels.length; i++) {
            PdfPCell cell = new PdfPCell();
            cell.setPadding(9f);
            cell.setBackgroundColor(new Color(0xF7, 0xF6, 0xFB));
            cell.setBorderColor(new Color(0xE7, 0xE5, 0xF2));
            Paragraph pl = new Paragraph(labels[i].toUpperCase(), lab);
            pl.setSpacingAfter(3f);
            cell.addElement(pl);
            cell.addElement(new Paragraph(values[i], big));
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
