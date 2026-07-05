package com.nexawork.project.services;

import com.nexawork.project.entities.enums.StatusCategory;

/**
 * Dérivation des indicateurs d'un statut Kanban à partir de sa catégorie fixe
 * (V5.1 §4.2 : « isInitial dérivable de la catégorie », « isFinal dérivable de
 * DONE/CLOSED »).
 */
public final class WorkflowRules {

    private WorkflowRules() {
    }

    public static boolean isInitial(StatusCategory category) {
        return category == StatusCategory.NOT_STARTED;
    }

    public static boolean isFinal(StatusCategory category) {
        return category == StatusCategory.DONE || category == StatusCategory.CLOSED;
    }
}
