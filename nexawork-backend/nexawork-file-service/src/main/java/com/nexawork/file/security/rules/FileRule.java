package com.nexawork.file.security.rules;

import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

@Component
public class FileRule {

    @Bean
    public SecurityRule uploadFile() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.POST)
            .apiPattern("/api/v1/files/**")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.MEMBER)
            .or().hasPermission(NexaWorkPermissions.ADMIN)
            .or().hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }

    @Bean
    public SecurityRule getFile() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.GET)
            .apiPattern("/api/v1/files/**")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.MEMBER)
            .or().hasPermission(NexaWorkPermissions.ADMIN)
            .or().hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }

    @Bean
    public SecurityRule deleteFile() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.DELETE)
            .apiPattern("/api/v1/files/**")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.ADMIN)
            .or().hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }
}
