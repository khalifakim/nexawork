package com.nexawork.project.configurations;

import com.nexawork.commons.audits.AuditorAwareImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Auditing JPA (V5.1 §3.6) : les colonnes createdBy/lastModifiedBy sont
 * alimentées par l'identité courante (userId issu du header Gateway) via
 * l'AuditorAwareImpl de commons.
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
public class JpaConfiguration {

    @Bean
    public AuditorAware<String> auditorProvider() {
        return new AuditorAwareImpl();
    }
}
