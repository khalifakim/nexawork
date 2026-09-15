package com.nexawork.project.services.impl;

import com.nexawork.project.dtos.responses.DashboardResponse;
import com.nexawork.project.dtos.responses.ProjectOverviewResponse;
import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.Task;
import com.nexawork.project.entities.WorkflowStatus;
import com.nexawork.project.entities.enums.ProjectHealth;
import com.nexawork.project.entities.enums.ProjectStatus;
import com.nexawork.project.entities.enums.StatusCategory;
import com.nexawork.project.repositories.ProjectMemberRepository;
import com.nexawork.project.repositories.ProjectRepository;
import com.nexawork.project.repositories.TaskRepository;
import com.nexawork.project.security.CallerContext;
import com.nexawork.project.security.ProjectGuard;
import com.nexawork.project.services.DashboardService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Agrégations de reporting (§13.2, §5.2, §6.4.1). Tableau de bord workspace
 * (R1 : ADMIN+OWNER) et vue d'ensemble projet (R15 : membre). Tout est calculé à
 * la volée sur les projets ACTIFS du workspace.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DashboardServiceImpl implements DashboardService {

    /** Seuil d'échéance proche (santé A_SURVEILLER + alerte), en jours. */
    private static final int DUE_SOON_DAYS = 7;
    /** Seuil d'inactivité (alerte projet sans activité), en jours. */
    private static final int INACTIVITY_DAYS = 14;
    /** Avancement en-dessous duquel un projet dont l'échéance approche est « à surveiller ». */
    private static final int HEALTHY_PROGRESS_THRESHOLD = 80;

    ProjectRepository projectRepository;
    ProjectMemberRepository projectMemberRepository;
    TaskRepository taskRepository;
    ProjectGuard guard;
    CallerContext caller;

    @Override
    public DashboardResponse getWorkspaceDashboard(UUID workspaceId) {
        // R1 : le tableau de bord est réservé aux administrateurs/propriétaires.
        caller.requireWorkspaceAdmin("consulter le tableau de bord");
        if (!workspaceId.equals(caller.organisationId())) {
            // Isolation : on ne rapporte que sur son propre workspace actif.
            caller.requireWorkspaceAdmin("consulter le tableau de bord d'un autre workspace");
        }
        UUID orgId = caller.organisationId();
        LocalDate today = LocalDate.now();

        List<Project> activeProjects = projectRepository
                .findByOrganisationIdAndStatus(orgId, ProjectStatus.ACTIVE);
        List<Task> tasks = taskRepository.findAllInProjects(orgId, ProjectStatus.ACTIVE);

        Map<UUID, List<Task>> tasksByProject = tasks.stream()
                .collect(Collectors.groupingBy(t -> t.getProject().getId()));

        int inProgressTasks = (int) tasks.stream().filter(this::isActiveTask).count();
        int overdueTasks = (int) tasks.stream().filter(t -> isOverdue(t, today)).count();
        int completedTasks = (int) tasks.stream().filter(this::isFinal).count();

        List<DashboardResponse.WorkloadEntry> workload = activeProjects.stream()
                .map(p -> DashboardResponse.WorkloadEntry.builder()
                        .projectId(p.getId())
                        .projectName(p.getName())
                        .color(p.getColor())
                        .activeTaskCount((int) tasksByProject.getOrDefault(p.getId(), List.of())
                                .stream().filter(this::isActiveTask).count())
                        .build())
                .toList();

        List<DashboardResponse.DashboardOverdueProject> overdueProjects = activeProjects.stream()
                .map(p -> {
                    int count = (int) tasksByProject.getOrDefault(p.getId(), List.of())
                            .stream().filter(t -> isOverdue(t, today)).count();
                    return Map.entry(p, count);
                })
                .filter(e -> e.getValue() > 0)
                .map(e -> DashboardResponse.DashboardOverdueProject.builder()
                        .id(e.getKey().getId())
                        .name(e.getKey().getName())
                        .color(e.getKey().getColor())
                        .count(e.getValue())
                        .build())
                .toList();

        List<DashboardResponse.DashboardProject> activeProjectsList = activeProjects.stream()
                .map(p -> {
                    List<Task> pt = tasksByProject.getOrDefault(p.getId(), List.of());
                    int progress = progressOf(pt);
                    boolean hasOverdue = pt.stream().anyMatch(t -> isOverdue(t, today));
                    Integer daysRemaining = p.getEndDate() != null
                            ? (int) ChronoUnit.DAYS.between(today, p.getEndDate()) : null;
                    return DashboardResponse.DashboardProject.builder()
                            .id(p.getId())
                            .name(p.getName())
                            .color(p.getColor())
                            .progress(progress)
                            .status(p.getStatus().name())
                            .endDate(p.getEndDate())
                            .daysRemaining(daysRemaining)
                            .health(healthOf(hasOverdue, daysRemaining, progress).name())
                            .build();
                })
                .toList();

        List<DashboardResponse.DashboardAlert> alerts = buildAlerts(activeProjects, tasksByProject, today);

        DashboardResponse.Kpis kpis = DashboardResponse.Kpis.builder()
                .activeProjects(activeProjects.size())
                .inProgressTasks(inProgressTasks)
                .overdueTasks(overdueTasks)
                .workspaceMembers(null) // domaine Auth — le frontend complète (option B)
                .totalTasks(tasks.size())
                .completedTasks(completedTasks)
                .build();

        return DashboardResponse.builder()
                .kpis(kpis)
                .workload(workload)
                .alerts(alerts)
                .activeProjectsList(activeProjectsList)
                .overdueProjects(overdueProjects)
                .build();
    }

    @Override
    public ProjectOverviewResponse getProjectOverview(UUID projectId) {
        Project project = guard.participantProject(projectId); // R15
        List<Task> tasks = taskRepository.findByProjectId(projectId);
        LocalDate today = LocalDate.now();

        int notStarted = 0, active = 0, done = 0, closed = 0, unassigned = 0;
        for (Task t : tasks) {
            StatusCategory cat = t.getStatus() != null ? t.getStatus().getCategory() : null;
            if (cat == null) {
                unassigned++;
            } else switch (cat) {
                case NOT_STARTED -> notStarted++;
                case ACTIVE -> active++;
                case DONE -> done++;
                case CLOSED -> closed++;
            }
        }
        int overdue = (int) tasks.stream().filter(t -> isOverdue(t, today)).count();

        List<ProjectOverviewResponse.UpcomingDueTask> upcoming = tasks.stream()
                .filter(t -> t.getDueDate() != null && !isFinal(t)
                        && !t.getDueDate().isBefore(today)
                        && !t.getDueDate().isAfter(today.plusDays(DUE_SOON_DAYS)))
                .sorted(Comparator.comparing(Task::getDueDate))
                .map(t -> ProjectOverviewResponse.UpcomingDueTask.builder()
                        .taskId(t.getId()).title(t.getTitle()).dueDate(t.getDueDate()).build())
                .toList();

        return ProjectOverviewResponse.builder()
                .projectId(project.getId())
                .name(project.getName())
                .color(project.getColor())
                .status(project.getStatus())
                .progress(progressOf(tasks))
                .totalTasks(tasks.size())
                .notStartedTasks(notStarted)
                .activeTasks(active)
                .doneTasks(done)
                .closedTasks(closed)
                .unassignedStatusTasks(unassigned)
                .overdueTasks(overdue)
                .memberCount((int) projectMemberRepository.countByProjectId(projectId))
                .upcomingDueTasks(upcoming)
                .build();
    }

    // ─── Helpers de calcul ────────────────────────────────────────────────────

    /** Tâche en cours = statut positionné de catégorie ACTIVE. */
    private boolean isActiveTask(Task t) {
        return t.getStatus() != null && t.getStatus().getCategory() == StatusCategory.ACTIVE;
    }

    /** Tâche en statut final (DONE/CLOSED). */
    private boolean isFinal(Task t) {
        WorkflowStatus s = t.getStatus();
        return s != null && Boolean.TRUE.equals(s.getIsFinal());
    }

    /** En retard = échéance passée et tâche non terminée. */
    private boolean isOverdue(Task t, LocalDate today) {
        return t.getDueDate() != null && t.getDueDate().isBefore(today) && !isFinal(t);
    }

    /** Avancement = % de tâches en statut final. */
    private int progressOf(List<Task> tasks) {
        if (tasks.isEmpty()) {
            return 0;
        }
        long finalCount = tasks.stream().filter(this::isFinal).count();
        return (int) Math.round(100.0 * finalCount / tasks.size());
    }

    private ProjectHealth healthOf(boolean hasOverdue, Integer daysRemaining, int progress) {
        if (hasOverdue) {
            return ProjectHealth.CRITIQUE;
        }
        if (daysRemaining != null && daysRemaining >= 0 && daysRemaining <= DUE_SOON_DAYS
                && progress < HEALTHY_PROGRESS_THRESHOLD) {
            return ProjectHealth.A_SURVEILLER;
        }
        return ProjectHealth.EN_BONNE_VOIE;
    }

    private List<DashboardResponse.DashboardAlert> buildAlerts(
            List<Project> activeProjects, Map<UUID, List<Task>> tasksByProject, LocalDate today) {
        List<DashboardResponse.DashboardAlert> alerts = new ArrayList<>();
        for (Project p : activeProjects) {
            List<Task> pt = tasksByProject.getOrDefault(p.getId(), List.of());

            long overdue = pt.stream().filter(t -> isOverdue(t, today)).count();
            if (overdue > 0) {
                alerts.add(alert("OVERDUE", "critique",
                        overdue + " tâche(s) en retard dans « " + p.getName() + " »", p.getId()));
            }
            if (p.getEndDate() != null) {
                long days = ChronoUnit.DAYS.between(today, p.getEndDate());
                if (days >= 0 && days <= DUE_SOON_DAYS) {
                    alerts.add(alert("DUE_SOON", "à surveiller",
                            "Échéance de « " + p.getName() + " » dans " + days + " jour(s)", p.getId()));
                }
            }
            if (isInactive(pt, today)) {
                alerts.add(alert("NO_ACTIVITY", "à surveiller",
                        "Aucune activité récente sur « " + p.getName() + " »", p.getId()));
            }
        }
        return alerts;
    }

    /** Projet sans mise à jour de tâche depuis ≥ INACTIVITY_DAYS jours (et ayant des tâches). */
    private boolean isInactive(List<Task> tasks, LocalDate today) {
        if (tasks.isEmpty()) {
            return false;
        }
        return tasks.stream().noneMatch(t -> {
            var ref = t.getLastModifiedDate() != null ? t.getLastModifiedDate() : t.getCreatedDate();
            return ref != null && ref.toLocalDate().isAfter(today.minusDays(INACTIVITY_DAYS));
        });
    }

    private DashboardResponse.DashboardAlert alert(String type, String severity, String message, UUID projectId) {
        return DashboardResponse.DashboardAlert.builder()
                .type(type).severity(severity).message(message).projectId(projectId).build();
    }
}
