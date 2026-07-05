package com.nexawork.project.dtos.responses;

import com.nexawork.project.entities.enums.ProjectStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Vue d'ensemble d'un projet (V5.1 §13.2, §6.4.1) : KPI, répartition des tâches
 * par catégorie de statut (donut) et échéances proches. Réservé aux membres du
 * projet (R15). Lecture seule pour un projet archivé (REF E).
 */
@Data
@Builder
public class ProjectOverviewResponse {

    private UUID projectId;
    private String name;
    private String color;
    private ProjectStatus status;
    private Integer progress;         // % de tâches en statut final
    private Integer totalTasks;
    private Integer notStartedTasks;
    private Integer activeTasks;
    private Integer doneTasks;
    private Integer closedTasks;
    private Integer unassignedStatusTasks; // tâches sans statut positionné
    private Integer overdueTasks;
    private Integer memberCount;
    private List<UpcomingDueTask> upcomingDueTasks;

    @Data
    @Builder
    public static class UpcomingDueTask {
        private UUID taskId;
        private String title;
        private LocalDate dueDate;
    }
}
