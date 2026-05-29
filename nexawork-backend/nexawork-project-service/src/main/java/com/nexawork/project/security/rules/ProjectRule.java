package com.nexawork.project.security.rules;

import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

@Component
public class ProjectRule {

    @Bean
    public SecurityRule getProjects() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.GET)
            .apiPattern("/api/v1/projects/**")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.MEMBER)
            .or().hasPermission(NexaWorkPermissions.ADMIN)
            .or().hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }

    @Bean
    public SecurityRule createProject() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.POST)
            .apiPattern("/api/v1/projects")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.ADMIN)
            .or().hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }

    @Bean
    public SecurityRule updateProject() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.PUT)
            .apiPattern("/api/v1/projects/**")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.ADMIN)
            .or().hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }

    @Bean
    public SecurityRule deleteProject() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.DELETE)
            .apiPattern("/api/v1/projects/**")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }
}
