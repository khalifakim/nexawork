package com.nexawork.messaging.security;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.security.SecurityUtils;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Accès typé à l'identité de l'appelant, propagée par l'API Gateway (headers →
 * {@link SecurityUtils}).
 */
@Component
public class CallerContext {

    public UUID userId() {
        return SecurityUtils.getCurrentUserId()
                .orElseThrow(() -> new ForbiddenException("Identité utilisateur absente."));
    }

    public UUID organisationId() {
        return SecurityUtils.getCurrentOrganisationId()
                .orElseThrow(() -> new ForbiddenException("Aucun workspace actif dans la session."));
    }

    /** Nom d'affichage de l'appelant (en-tête X-User-Name posé par la Gateway). */
    public String displayName() {
        return SecurityUtils.getCurrentDisplayName().orElse("Quelqu'un");
    }

    public String orgRole() {
        return SecurityUtils.getCurrentOrgRole().orElse(null);
    }

    /** Administrateur ou propriétaire du workspace (R14, REF D). */
    public boolean isWorkspaceAdmin() {
        String role = orgRole();
        return "OWNER".equals(role) || "ADMIN".equals(role);
    }
}
