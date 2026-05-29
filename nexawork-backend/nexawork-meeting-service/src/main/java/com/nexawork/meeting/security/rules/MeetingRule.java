package com.nexawork.meeting.security.rules;

import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

@Component
public class MeetingRule {

    @Bean
    public SecurityRule getMeetings() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.GET)
            .apiPattern("/api/v1/meetings/**")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.MEMBER)
            .or().hasPermission(NexaWorkPermissions.ADMIN)
            .or().hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }

    @Bean
    public SecurityRule createMeeting() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.POST)
            .apiPattern("/api/v1/meetings")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.MEMBER)
            .or().hasPermission(NexaWorkPermissions.ADMIN)
            .or().hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }

    @Bean
    public SecurityRule deleteMeeting() {
        return SecurityRule.builder()
            .httpMethod(HttpMethod.DELETE)
            .apiPattern("/api/v1/meetings/**")
            .build()
            .condition()
            .hasPermission(NexaWorkPermissions.ADMIN)
            .or().hasPermission(NexaWorkPermissions.OWNER)
            .end();
    }
}
