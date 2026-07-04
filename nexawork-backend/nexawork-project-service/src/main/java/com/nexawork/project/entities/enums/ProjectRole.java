package com.nexawork.project.entities.enums;

/**
 * Rôle d'un membre au sein d'un projet (V5.1 §6.2). Distinct du rôle workspace
 * (OrgRole) porté par le token.
 */
public enum ProjectRole {
    MANAGER,
    DEVELOPER,
    VIEWER
}
