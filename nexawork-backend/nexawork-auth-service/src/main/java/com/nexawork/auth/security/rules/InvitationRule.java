package com.nexawork.auth.security.rules;

import com.nexawork.commons.security.rules.SecurityRule;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

/**
 * Règles d'accès de gestion des invitations (§13.1) — relance et annulation
 * réservées aux administrateurs. La consultation et l'acceptation par token
 * (publiques) sont dans AuthRule.
 */
@Component
public class InvitationRule {

    static final String INVITATIONS_API_PREFIX = "/api/v1/invitations";
    static final String INVITATION_ID = "/{invId}";

    @Bean
    public SecurityRule resendInvitation() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.POST)
                .apiPattern(INVITATIONS_API_PREFIX + INVITATION_ID + "/resend")
                .build()
                .condition()
                .hasPermission(NexaWorkPermissions.MANAGE_INVITATIONS)
                .hasPermission(NexaWorkPermissions.ALL_ACCESS)
                .end();
    }

    @Bean
    public SecurityRule cancelInvitation() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.DELETE)
                .apiPattern(INVITATIONS_API_PREFIX + INVITATION_ID)
                .build()
                .condition()
                .hasPermission(NexaWorkPermissions.MANAGE_INVITATIONS)
                .hasPermission(NexaWorkPermissions.ALL_ACCESS)
                .end();
    }
}
