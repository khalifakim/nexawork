package com.nexawork.auth.security.rules;

import com.nexawork.commons.security.rules.SecurityRule;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

/**
 * Règles d'accès du profil utilisateur courant (§13.1 /users/me/**).
 */
@Component
public class UserRule {

    static final String USERS_ME_API_PREFIX = "/api/v1/users/me";

    @Bean
    public SecurityRule readMe() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.GET)
                .apiPattern(USERS_ME_API_PREFIX)
                .build();
    }

    @Bean
    public SecurityRule updateMyProfile() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.PATCH)
                .apiPattern(USERS_ME_API_PREFIX + "/profile")
                .build()
                .condition()
                .hasPermission(NexaWorkPermissions.EDIT_PROFILE)
                .hasPermission(NexaWorkPermissions.ALL_ACCESS)
                .end();
    }

    @Bean
    public SecurityRule updateMyPassword() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.PATCH)
                .apiPattern(USERS_ME_API_PREFIX + "/password")
                .build()
                .condition()
                .hasPermission(NexaWorkPermissions.EDIT_PROFILE)
                .hasPermission(NexaWorkPermissions.ALL_ACCESS)
                .end();
    }

    @Bean
    public SecurityRule requestEmailChange() {
        return SecurityRule.builder()
                .httpMethod(HttpMethod.POST)
                .apiPattern(USERS_ME_API_PREFIX + "/email")
                .build()
                .condition()
                .hasPermission(NexaWorkPermissions.EDIT_PROFILE)
                .hasPermission(NexaWorkPermissions.ALL_ACCESS)
                .end();
    }
}
