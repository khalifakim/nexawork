package com.nexawork.ged.security.rules;

import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

@Component
public class GedRule {

    @Bean
    public SecurityRule getGed() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.GET)
            .apiPattern("/api/v1/ged/**")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.MEMBER)
            .or().hasPermission(NexaWorkPermissions.ADMIN)
            .or().hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }

    @Bean
    public SecurityRule createGed() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.POST)
            .apiPattern("/api/v1/ged/**")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.MEMBER)
            .or().hasPermission(NexaWorkPermissions.ADMIN)
            .or().hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }

    @Bean
    public SecurityRule deleteGed() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.DELETE)
            .apiPattern("/api/v1/ged/**")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.ADMIN)
            .or().hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }
}
