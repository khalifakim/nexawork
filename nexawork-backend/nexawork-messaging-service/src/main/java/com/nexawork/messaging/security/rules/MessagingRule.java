package com.nexawork.messaging.security.rules;

import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

@Component
public class MessagingRule {

    @Bean
    public SecurityRule getChannels() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.GET)
            .apiPattern("/api/v1/channels/**")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.MEMBER)
            .or().hasPermission(NexaWorkPermissions.ADMIN)
            .or().hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }

    @Bean
    public SecurityRule sendMessage() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.POST)
            .apiPattern("/api/v1/channels/*/messages")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.MEMBER)
            .or().hasPermission(NexaWorkPermissions.ADMIN)
            .or().hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }

    @Bean
    public SecurityRule createChannel() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.POST)
            .apiPattern("/api/v1/channels")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.ADMIN)
            .or().hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }
}
