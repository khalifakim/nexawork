package com.nexawork.auth.entities.enums;

/**
 * Rôle d'accès d'un utilisateur dans un workspace (V5.1 §6.1).
 * OWNER = Propriétaire (fondateur), intangible (REF C).
 */
public enum OrgRole {
    OWNER, ADMIN, MEMBER
}
