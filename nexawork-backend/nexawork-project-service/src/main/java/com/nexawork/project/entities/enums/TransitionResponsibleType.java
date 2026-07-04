package com.nexawork.project.entities.enums;

/**
 * Responsable autorisé d'une transition de workflow (V5.1 §6.2, §4.2) :
 * Tous les membres / le chef de projet / un membre désigné.
 */
public enum TransitionResponsibleType {
    ALL,
    PROJECT_LEAD,
    SPECIFIC_MEMBER
}
