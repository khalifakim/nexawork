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
    static final String INVITATION_TOKEN = "/{token}";

    /**
     * Acceptation par un utilisateur déjà inscrit — authentifié (le service
     * vérifie que l'email de l'appelant correspond à l'invitation). La création
     * de compte par token ({@code /accept}) reste publique (AuthRule).
     */
    @Bean
    public SecurityRule joinInvitation() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.POST)
                .apiPattern(INVITATIONS_API_PREFIX + INVITATION_TOKEN + "/join")
                .build();
    }

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
