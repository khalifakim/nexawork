package com.nexawork.commons.security;

import io.jsonwebtoken.Claims;
import lombok.experimental.UtilityClass;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Optional;
import java.util.UUID;

/**
 * Helpers SecurityContext clonés de Smart-Mifin, enrichis des claims NexaWork
 * (userId, organisationId, orgRole) déposés par le TokenProvider dans les
 * details de l'Authentication.
 */
@UtilityClass
public class SecurityUtils {

    public static final String CLAIM_USER_ID = "userId";
    public static final String CLAIM_ORGANISATION_ID = "organisationId";
    public static final String CLAIM_ORG_ROLE = "orgRole";
    public static final String CLAIM_DISPLAY_NAME = "displayName";

    public Optional<String> getCurrentUserLogin() {
        SecurityContext securityContext = SecurityContextHolder.getContext();
        return Optional.ofNullable(extractPrincipal(securityContext.getAuthentication()));
    }

    public Optional<UUID> getCurrentUserId() {
        return getClaim(CLAIM_USER_ID).map(UUID::fromString);
    }

    public Optional<UUID> getCurrentOrganisationId() {
        return getClaim(CLAIM_ORGANISATION_ID).map(UUID::fromString);
    }

    public Optional<String> getCurrentOrgRole() {
        return getClaim(CLAIM_ORG_ROLE);
    }

    public Optional<String> getCurrentDisplayName() {
        return getClaim(CLAIM_DISPLAY_NAME);
    }

    private static Optional<String> getClaim(String claimName) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getDetails() instanceof Claims claims) {
            Object value = claims.get(claimName);
            return Optional.ofNullable(value).map(Object::toString).filter(s -> !s.isBlank());
        }
        return Optional.empty();
    }

    private static String extractPrincipal(Authentication authentication) {
        if (authentication == null) {
            return null;
        } else if (authentication.getPrincipal() instanceof UserDetails springSecurityUser) {
            return springSecurityUser.getUsername();
        } else if (authentication.getPrincipal() instanceof String principal) {
            return principal;
        }
        return null;
    }
}
