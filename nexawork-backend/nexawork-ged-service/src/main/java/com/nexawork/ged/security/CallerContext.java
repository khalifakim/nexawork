package com.nexawork.ged.security;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.security.SecurityUtils;
import org.springframework.stereotype.Component;

import java.util.Optional;
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

    public Optional<UUID> organisationIdOptional() {
        return SecurityUtils.getCurrentOrganisationId();
    }

    public String orgRole() {
        return SecurityUtils.getCurrentOrgRole().orElse(null);
    }

    /** Administrateur ou propriétaire du workspace. */
    public boolean isWorkspaceAdmin() {
        String role = orgRole();
        return "OWNER".equals(role) || "ADMIN".equals(role);
    }
}
