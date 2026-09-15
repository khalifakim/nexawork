package com.nexawork.project.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Tableau de bord global d'un workspace (V5.1 §13.2, §5.2). Réservé ADMIN+OWNER
 * (R1). Agrégations calculées, non stockées.
 */
@Data
@Builder
public class DashboardResponse {

    private Kpis kpis;
    private List<WorkloadEntry> workload;
    private List<DashboardAlert> alerts;
    private List<DashboardProject> activeProjectsList;
    private List<DashboardOverdueProject> overdueProjects;

    /** 4 indicateurs clés (§5.2). */
    @Data
    @Builder
    public static class Kpis {
        private Integer activeProjects;
        private Integer inProgressTasks;
        private Integer overdueTasks;
        private Integer workspaceMembers;
        /** Nombre total de tâches (tous projets actifs du workspace). */
        private Integer totalTasks;
        /** Tâches en statut final (DONE/CLOSED), tous projets actifs confondus. */
        private Integer completedTasks;
    }

    /** Charge par projet : nombre de tâches actives (§5.2 « charge par projet »). */
    @Data
    @Builder
    public static class WorkloadEntry {
        private UUID projectId;
        private String projectName;
        private String color;
        private Integer activeTaskCount;
    }

    /** Alerte cliquable (§5.2). */
    @Data
    @Builder
    public static class DashboardAlert {
        private String type;      // OVERDUE / DUE_SOON / CRITICAL_PROJECT / NO_ACTIVITY
        private String severity;  // critique / à surveiller / normal
        private String message;
        private UUID projectId;
    }

    /** Projet en cours (KPI/carte cliquable) avec santé calculée. */
    @Data
    @Builder
    public static class DashboardProject {
        private UUID id;
        private String name;
        private String color;
        private Integer progress;       // % de tâches en statut final
        private String status;          // ACTIVE
        private LocalDate endDate;
        private Integer daysRemaining;  // null si pas d'échéance
        private String health;          // EN_BONNE_VOIE / A_SURVEILLER / CRITIQUE
    }

    /** Ligne de la modale « Tâches en retard » (breakdown par projet). */
    @Data
    @Builder
    public static class DashboardOverdueProject {
        private UUID id;      // id projet (deep-link Kanban ?ech=retard)
        private String name;
        private String color;
        private Integer count;
    }
}
