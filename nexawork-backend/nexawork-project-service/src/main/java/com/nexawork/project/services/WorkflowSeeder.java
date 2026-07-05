package com.nexawork.project.services;

import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.WorkflowStatus;
import com.nexawork.project.entities.WorkflowTransition;
import com.nexawork.project.entities.enums.StatusCategory;
import com.nexawork.project.entities.enums.TransitionResponsibleType;
import com.nexawork.project.repositories.WorkflowStatusRepository;
import com.nexawork.project.repositories.WorkflowTransitionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Sème le workflow Kanban par défaut à la création d'un projet (V5.1 §8.1) :
 * 4 colonnes — À faire (NOT_STARTED, initial), En cours (ACTIVE), En révision
 * (ACTIVE), Validé (DONE, final) — reliées par des transitions linéaires ouvertes
 * à tous (ALL). Composant dédié pour éviter tout cycle avec ProjectService.
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WorkflowSeeder {

    WorkflowStatusRepository statusRepository;
    WorkflowTransitionRepository transitionRepository;

    public void seedDefault(Project project) {
        WorkflowStatus todo = status(project, "À faire", StatusCategory.NOT_STARTED, 0, "#94a3b8");
        WorkflowStatus doing = status(project, "En cours", StatusCategory.ACTIVE, 1, "#3b82f6");
        WorkflowStatus review = status(project, "En révision", StatusCategory.ACTIVE, 2, "#f59e0b");
        WorkflowStatus done = status(project, "Validé", StatusCategory.DONE, 3, "#22c55e");

        List<WorkflowStatus> statuses = statusRepository.saveAll(List.of(todo, doing, review, done));

        // Transitions linéaires ouvertes à tous les membres (responsable = ALL).
        transitionRepository.saveAll(List.of(
                transition(statuses.get(0), statuses.get(1)),
                transition(statuses.get(1), statuses.get(2)),
                transition(statuses.get(2), statuses.get(3))
        ));
    }

    private WorkflowStatus status(Project project, String name, StatusCategory category,
                                  int position, String color) {
        return WorkflowStatus.builder()
                .project(project)
                .name(name)
                .category(category)
                .position(position)
                .isInitial(WorkflowRules.isInitial(category))
                .isFinal(WorkflowRules.isFinal(category))
                .color(color)
                .build();
    }

    private WorkflowTransition transition(WorkflowStatus from, WorkflowStatus to) {
        return WorkflowTransition.builder()
                .fromStatus(from)
                .toStatus(to)
                .responsibleType(TransitionResponsibleType.ALL)
                .build();
    }
}
