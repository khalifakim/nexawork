package com.nexawork.commons.audits;

import com.nexawork.commons.security.SecurityUtils;
import org.springframework.data.domain.AuditorAware;

import java.util.Optional;

/**
 * Fournit le login de l'utilisateur courant aux colonnes d'audit JPA.
 * Déclaré comme bean dans la JpaConfiguration de chaque microservice.
 */
public class AuditorAwareImpl implements AuditorAware<String> {

    private static final String SYSTEM_ACCOUNT = "system";

    @Override
    public Optional<String> getCurrentAuditor() {
        return Optional.of(SecurityUtils.getCurrentUserLogin().orElse(SYSTEM_ACCOUNT));
    }
}
