package com.nexawork.auth.security.rules;

import com.nexawork.commons.security.rules.SecurityRule;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

/**
 * Règles d'accès workspace-members (§13.1). R18 (self/OWNER interdits) et
 * R20 (self-leave) sont appliquées en service (400/403).
 */
@Component
public class WorkspaceMemberRule {

    static final String MEMBERS_API_PREFIX = "/api/v1/workspace-members";
    static final String MEMBER_ID = "/{id}";

    @Bean
    public SecurityRule changeMemberRole() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.PATCH)
                .apiPattern(MEMBERS_API_PREFIX + MEMBER_ID + "/role")
                .build()
                .condition()
                .hasPermission(NexaWorkPermissions.CHANGE_MEMBER_ROLE)
                .hasPermission(NexaWorkPermissions.ALL_ACCESS)
                .end();
    }

    @Bean
    public SecurityRule toggleMemberActive() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.PATCH)
                .apiPattern(MEMBERS_API_PREFIX + MEMBER_ID + "/active")
                .build()
                .condition()
                .hasPermission(NexaWorkPermissions.TOGGLE_MEMBER_ACTIVE)
                .hasPermission(NexaWorkPermissions.ALL_ACCESS)
                .end();
    }

    @Bean
    public SecurityRule removeMember() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.DELETE)
                .apiPattern(MEMBERS_API_PREFIX + MEMBER_ID)
                .build()
                .condition()
                .hasPermission(NexaWorkPermissions.REMOVE_MEMBER)
                .hasPermission(NexaWorkPermissions.ALL_ACCESS)
                .end();
    }

    /**
     * R20 — self-leave : accessible à tout membre authentifié ; le service
     * refuse 400 si l'appelant est OWNER (REF C) et révoque la session si le
     * workspace quitté est actif.
     */
    @Bean
    public SecurityRule leaveWorkspace() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.POST)
                .apiPattern(MEMBERS_API_PREFIX + "/leave")
                .build()
                .condition()
                .hasPermission(NexaWorkPermissions.LEAVE_WORKSPACE)
                .hasPermission(NexaWorkPermissions.ALL_ACCESS)
                .end();
    }
}
