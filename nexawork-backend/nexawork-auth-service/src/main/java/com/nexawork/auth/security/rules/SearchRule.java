package com.nexawork.auth.security.rules;

import com.nexawork.commons.security.SecurityRule;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

/**
 * Règle d'accès de la recherche globale (§4.8) — volet Personnes.
 * Ouverte à tout utilisateur authentifié : le périmètre est borné au workspace
 * courant par la requête elle-même (membres actifs de l'organisation du jeton).
 */
@Component
public class SearchRule {

    static final String SEARCH_API_PREFIX = "/api/v1/search";

    @Bean
    public SecurityRule searchMembers() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.GET)
                .apiPattern(SEARCH_API_PREFIX)
                .build();
    }
}
