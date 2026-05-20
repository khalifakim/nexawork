package com.nexawork.auth.security.rules;

import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

@Component
public class OrganisationRule {

    @Bean
    public SecurityRule createOrganisation() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.POST)
            .apiPattern("/api/v1/organisations")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.CREATE_ORGANISATION)
            .or()
            .hasPermission(NexaWorkPermissions.ALL_ACCESS)
            .end();
    }

    @Bean
    public SecurityRule getOrganisation() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.GET)
            .apiPattern("/api/v1/organisations/*")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.VIEW_ORGANISATION)
            .or()
            .hasPermission(NexaWorkPermissions.ALL_ACCESS)
            .end();
    }

    @Bean
    public SecurityRule inviteMember() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.POST)
            .apiPattern("/api/v1/organisations/*/invite")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.MANAGE_MEMBERS)
            .or()
            .hasPermission(NexaWorkPermissions.ALL_ACCESS)
            .end();
    }

    @Bean
    public SecurityRule listMembers() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.GET)
            .apiPattern("/api/v1/organisations/*/members")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.VIEW_ORGANISATION)
            .or()
            .hasPermission(NexaWorkPermissions.ALL_ACCESS)
            .end();
    }

    @Bean
    public SecurityRule updateMemberRole() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.PUT)
            .apiPattern("/api/v1/organisations/*/members/*/role")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.MANAGE_MEMBERS)
            .or()
            .hasPermission(NexaWorkPermissions.ALL_ACCESS)
            .end();
    }

    @Bean
    public SecurityRule removeMember() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.DELETE)
            .apiPattern("/api/v1/organisations/*/members/*")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.MANAGE_MEMBERS)
            .or()
            .hasPermission(NexaWorkPermissions.ALL_ACCESS)
            .end();
    }
}
