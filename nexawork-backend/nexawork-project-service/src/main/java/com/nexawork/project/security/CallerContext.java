package com.nexawork.project.security;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.security.SecurityUtils;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Accès typé à l'identité de l'appelant, telle que propagée par l'API Gateway
 * (headers → {@link SecurityUtils}). Centralise les vérifications de rôle
 * workspace réutilisées par les règles REF/R du Project Service.
 *
 * <p>Rôles workspace (OrgRole côté Auth) : {@code OWNER}, {@code ADMIN},
 * {@code MEMBER}. Le « chef de projet » (CP) n'est pas un rôle workspace : il se
 * déduit de {@code Project.ownerUserId} (V5.1 §4.2) et se vérifie en service.</p>
 */
@Component
public class CallerContext {

    /** Identifiant de l'utilisateur courant (X-User-Id). */
    public UUID userId() {
        return SecurityUtils.getCurrentUserId()
                .orElseThrow(() -> new ForbiddenException("Identité utilisateur absente."));
    }

    /** Workspace actif de l'appelant (X-Org-Id). */
    public UUID organisationId() {
        return SecurityUtils.getCurrentOrganisationId()
                .orElseThrow(() -> new ForbiddenException("Aucun workspace actif dans la session."));
    }

    /** Rôle workspace de l'appelant (X-Org-Role), ou vide si non défini. */
    public String orgRole() {
        return SecurityUtils.getCurrentOrgRole().orElse(null);
    }

    /** Vrai si l'appelant est administrateur ou propriétaire du workspace. */
    public boolean isWorkspaceAdmin() {
        String role = orgRole();
        return "OWNER".equals(role) || "ADMIN".equals(role);
    }

    /**
     * Exige un rôle ADMIN ou OWNER (règles R1, R6, R7 : archivage / restauration /
     * suppression / projets archivés / tableau de bord).
     */
    public void requireWorkspaceAdmin(String action) {
        if (!isWorkspaceAdmin()) {
            throw new ForbiddenException("Action réservée aux administrateurs et au propriétaire : " + action);
        }
    }
}
