package com.nexawork.auth.security.rules;

import com.nexawork.commons.security.rules.NexaWorkPermission;
import com.nexawork.auth.entities.enums.OrgRole;

import java.util.EnumSet;
import java.util.Set;

/**
 * Permissions du service Auth (adapté de SecurityPermissions Smart-Mifin),
 * cohérentes avec REF C/H et R17/R18. Les authorities du JWT sont dérivées du
 * rôle d'accès (OrgRole) du workspace actif via {@link #forRole(OrgRole)}.
 */
public enum NexaWorkPermissions implements NexaWorkPermission {

    /** OWNER uniquement — accès intégral, y compris DELETE workspace (REF H). */
    ALL_ACCESS,

    READ_WORKSPACE,
    EDIT_WORKSPACE,
    DELETE_WORKSPACE,

    READ_MEMBERS,
    CHANGE_MEMBER_ROLE,
    TOGGLE_MEMBER_ACTIVE,
    REMOVE_MEMBER,

    INVITE_MEMBER,
    MANAGE_INVITATIONS,

    /** Accordées à tout utilisateur authentifié, sans contexte workspace. */
    EDIT_PROFILE,
    CREATE_WORKSPACE,
    LEAVE_WORKSPACE;

    /**
     * Permissions de base de tout utilisateur authentifié (hors contexte workspace).
     */
    public static Set<NexaWorkPermissions> base() {
        return EnumSet.of(EDIT_PROFILE, CREATE_WORKSPACE, LEAVE_WORKSPACE);
    }

    /**
     * Permissions dérivées du rôle d'accès dans le workspace actif.
     * REF H : DELETE_WORKSPACE réservé au OWNER (ADMIN exclu).
     */
    public static Set<NexaWorkPermissions> forRole(OrgRole role) {
        Set<NexaWorkPermissions> permissions = base();
        if (role == null) {
            return permissions;
        }
        switch (role) {
            case OWNER -> permissions.addAll(EnumSet.of(
                    ALL_ACCESS, READ_WORKSPACE, EDIT_WORKSPACE, DELETE_WORKSPACE,
                    READ_MEMBERS, CHANGE_MEMBER_ROLE, TOGGLE_MEMBER_ACTIVE, REMOVE_MEMBER,
                    INVITE_MEMBER, MANAGE_INVITATIONS));
            case ADMIN -> permissions.addAll(EnumSet.of(
                    READ_WORKSPACE, EDIT_WORKSPACE,
                    READ_MEMBERS, CHANGE_MEMBER_ROLE, TOGGLE_MEMBER_ACTIVE, REMOVE_MEMBER,
                    INVITE_MEMBER, MANAGE_INVITATIONS));
            case MEMBER -> permissions.addAll(EnumSet.of(
                    READ_WORKSPACE, READ_MEMBERS));
        }
        return permissions;
    }
}
