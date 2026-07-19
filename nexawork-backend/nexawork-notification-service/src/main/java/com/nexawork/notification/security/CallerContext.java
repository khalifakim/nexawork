package com.nexawork.notification.security;

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

    /** Workspace actif (header {@code X-Org-Id}) — scope les notifications. */
    public UUID organisationId() {
        return SecurityUtils.getCurrentOrganisationId()
                .orElseThrow(() -> new ForbiddenException("Aucun workspace actif dans la session."));
    }
}
