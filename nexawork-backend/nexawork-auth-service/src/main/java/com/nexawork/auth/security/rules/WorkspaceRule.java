package com.nexawork.auth.security.rules;

import com.nexawork.commons.security.rules.SecurityRule;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

/**
 * Règles d'accès workspaces (§13.1). Les règles fines (REF C/H/I, appartenance
 * au workspace ciblé) sont revalidées en service contre la base — le RBAC
 * déclaratif filtre au niveau route.
 */
@Component
public class WorkspaceRule {

    static final String WORKSPACES_API_PREFIX = "/api/v1/workspaces";
    static final String WORKSPACE_ID = "/{id}";

    @Bean
    public SecurityRule listMyWorkspaces() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.GET)
                .apiPattern(WORKSPACES_API_PREFIX)
                .build();
    }

    /**
     * REF I — la création ne bascule pas le contexte de session.
     */
    @Bean
    public SecurityRule createWorkspace() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.POST)
                .apiPattern(WORKSPACES_API_PREFIX)
                .build()
                .condition()
                .hasPermission(NexaWorkPermissions.CREATE_WORKSPACE)
                .hasPermission(NexaWorkPermissions.ALL_ACCESS)
                .end();
    }

    @Bean
    public SecurityRule readWorkspace() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.GET)
                .apiPattern(WORKSPACES_API_PREFIX + WORKSPACE_ID)
                .build();
    }

    @Bean
    public SecurityRule updateWorkspace() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.PATCH)
                .apiPattern(WORKSPACES_API_PREFIX + WORKSPACE_ID)
                .build()
                .condition()
                .hasPermission(NexaWorkPermissions.EDIT_WORKSPACE)
                .hasPermission(NexaWorkPermissions.ALL_ACCESS)
                .end();
    }

    /**
     * REF H — OWNER uniquement : seule ALL_ACCESS ouvre la route ; le service
     * revérifie isOwner sur le workspace ciblé et propage la déconnexion.
     */
    @Bean
    public SecurityRule deleteWorkspace() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.DELETE)
                .apiPattern(WORKSPACES_API_PREFIX + WORKSPACE_ID)
                .build()
                .condition()
                .hasPermission(NexaWorkPermissions.ALL_ACCESS)
                .end();
    }

    @Bean
    public SecurityRule listMembers() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.GET)
                .apiPattern(WORKSPACES_API_PREFIX + WORKSPACE_ID + "/members")
                .build()
                .condition()
                .hasPermission(NexaWorkPermissions.READ_MEMBERS)
                .hasPermission(NexaWorkPermissions.ALL_ACCESS)
                .end();
    }

    @Bean
    public SecurityRule listInvitations() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.GET)
                .apiPattern(WORKSPACES_API_PREFIX + WORKSPACE_ID + "/invitations")
                .build()
                .condition()
                .hasPermission(NexaWorkPermissions.MANAGE_INVITATIONS)
                .hasPermission(NexaWorkPermissions.ALL_ACCESS)
                .end();
    }

    @Bean
    public SecurityRule sendInvitations() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.POST)
                .apiPattern(WORKSPACES_API_PREFIX + WORKSPACE_ID + "/invitations")
                .build()
                .condition()
                .hasPermission(NexaWorkPermissions.INVITE_MEMBER)
                .hasPermission(NexaWorkPermissions.ALL_ACCESS)
                .end();
    }
}
