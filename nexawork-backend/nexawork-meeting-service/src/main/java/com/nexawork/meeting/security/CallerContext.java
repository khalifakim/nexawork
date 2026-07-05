package com.nexawork.meeting.security;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.security.SecurityUtils;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Accès typé à l'identité de l'appelant (headers Gateway → {@link SecurityUtils}).
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

    public String displayName() {
        return SecurityUtils.getCurrentDisplayName().orElse("Utilisateur");
    }

    public boolean isWorkspaceAdmin() {
        String role = SecurityUtils.getCurrentOrgRole().orElse(null);
        return "OWNER".equals(role) || "ADMIN".equals(role);
    }
}
