package com.nexawork.file.security;

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

    /** Workspace actif de l'appelant (X-Org-Id), optionnel (nul avant sélection). */
    public Optional<UUID> organisationId() {
        return SecurityUtils.getCurrentOrganisationId();
    }
}
