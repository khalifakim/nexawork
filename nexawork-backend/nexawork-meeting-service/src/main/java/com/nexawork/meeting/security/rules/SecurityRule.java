package com.nexawork.meeting.security.rules;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SecurityRule {

    @NonNull
    HttpMethod httpMethod;

    @Singular
    List<String> apiPatterns;

    @Builder.Default
    boolean authenticated = true;

    @Builder.Default
    List<Condition> conditions = new ArrayList<>();

    public void configure(HttpSecurity http) throws Exception {
        String authAccess = authenticated ? "isAuthenticated()" : null;

        String allConditions = conditions.stream()
            .map(Condition::toFormat)
            .filter(s -> s != null && !s.isEmpty())
            .collect(Collectors.joining(" or "));

        String access = Arrays.stream(new String[]{authAccess, allConditions})
            .filter(s -> s != null && !s.isEmpty())
            .collect(Collectors.joining(" and ", "(", ")"))
            .replace("()", "");

        if (!StringUtils.hasText(access) || "()".equals(access)) {
            http.authorizeHttpRequests(a -> a
                .requestMatchers(httpMethod, apiPatterns.toArray(new String[0]))
                .permitAll());
        } else {
            final String finalAccess = access;
            http.authorizeHttpRequests(a -> a
                .requestMatchers(httpMethod, apiPatterns.toArray(new String[0]))
                .access(new WebExpressionAuthorizationManager(finalAccess)));
        }
    }

    public Condition condition() {
        Condition c = new Condition(this);
        this.conditions.add(c);
        return c;
    }

    @RequiredArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public class Condition {

        final Set<NexaWorkPermissions> permissions = new HashSet<>();
        String controlMethod;
        final SecurityRule securityRule;

        public Condition hasPermission(NexaWorkPermissions permission) {
            this.permissions.add(permission);
            return this;
        }

        public Condition controlMethod(String method) {
            this.controlMethod = method;
            return this;
        }

        public Condition or() {
            return securityRule.condition();
        }

        public SecurityRule end() {
            return securityRule;
        }

        String toFormat() {
            StringJoiner result = new StringJoiner(" and ", "(", ")").setEmptyValue("");
            if (!permissions.isEmpty()) {
                String anyAuth = permissions.stream()
                    .map(p -> "T(" + NexaWorkPermissions.class.getName() + ")." + p.name())
                    .collect(Collectors.joining(","));
                result.add("hasAnyAuthority(" + anyAuth + ")");
            }
            if (StringUtils.hasText(controlMethod)) {
                result.add(controlMethod);
            }
            return result.toString();
        }
    }
}
