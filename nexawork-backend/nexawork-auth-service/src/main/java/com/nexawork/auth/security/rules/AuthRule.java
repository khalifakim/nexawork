package com.nexawork.auth.security.rules;

import com.nexawork.commons.security.rules.SecurityRule;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

/**
 * Routes publiques d'authentification (§13.1) : register, login, refresh,
 * reset de mot de passe, consultation/acceptation d'invitation par token.
 */
@Component
public class AuthRule {

    static final String AUTH_API_PREFIX = "/api/v1/auth";
    static final String INVITATIONS_API_PREFIX = "/api/v1/invitations";

    @Bean
    public SecurityRule publicAuthEndpoints() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.POST)
                .apiPattern(AUTH_API_PREFIX + "/register")
                .apiPattern(AUTH_API_PREFIX + "/login")
                .apiPattern(AUTH_API_PREFIX + "/refresh")
                .apiPattern(AUTH_API_PREFIX + "/password/reset-request")
                .apiPattern(AUTH_API_PREFIX + "/password/reset")
                .apiPattern(AUTH_API_PREFIX + "/verify-email")
                .authenticated(false)
                .build();
    }

    @Bean
    public SecurityRule logout() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.POST)
                .apiPattern(AUTH_API_PREFIX + "/logout")
                .build();
    }

    /**
     * Consultation du contexte d'invitation (bandeau §3.2) — public : la
     * personne invitée n'a pas encore de compte.
     */
    @Bean
    public SecurityRule readInvitationByToken() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.GET)
                .apiPattern(INVITATIONS_API_PREFIX + "/{token}")
                .authenticated(false)
                .build();
    }

    /**
     * Acceptation d'invitation (création de compte + adhésion) — public.
     */
    @Bean
    public SecurityRule acceptInvitation() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.POST)
                .apiPattern(INVITATIONS_API_PREFIX + "/{token}/accept")
                .authenticated(false)
                .build();
    }
}
