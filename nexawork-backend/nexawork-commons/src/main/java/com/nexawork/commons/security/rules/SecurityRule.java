package com.nexawork.commons.security.rules;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.Singular;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.StringJoiner;
import java.util.stream.Collectors;

/**
 * Framework de règles de sécurité déclaratives cloné de Smart-Mifin,
 * adapté Spring Security 6 (Boot 3.5) : {@code authorizeHttpRequests()} +
 * {@code requestMatchers()} + {@code WebExpressionAuthorizationManager}
 * remplacent {@code authorizeRequests()} + {@code antMatchers()} + SpEL string.
 *
 * <p>Chaque bean de ce type configure l'accès d'un groupe d'URIs pour un verbe
 * HTTP : conditions concaténées en "or", chaque condition combinant permissions
 * ({@code hasAnyAuthority}) et méthode de contrôle SpEL en "and".</p>
 */
@Slf4j
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SecurityRule {

    /**
     * Http method GET, POST, PUT, PATCH or DELETE
     */
    @NotNull
    HttpMethod httpMethod;

    /**
     * List of APIs patterns
     */
    @NotEmpty
    @Singular
    List<String> apiPatterns;

    /**
     * Defines if user should be authenticated — true by default
     */
    @Builder.Default
    boolean authenticated = true;

    /**
     * List of conditions to authorize the access to the listed APIs
     */
    @Builder.Default
    List<Condition> conditions = new ArrayList<>();

    /**
     * Applies new security configuration into the HttpSecurity parameter
     */
    public void configure(HttpSecurity httpSecurity) throws Exception {
        String authenticationAccess = authenticated ? "isAuthenticated()" : null;

        // allConditions = "(condition1) or (condition2) or ..."
        String allConditions = conditions.stream()
                .map(Condition::toFormat)
                .filter(s -> s != null && !s.isEmpty())
                .collect(() -> new StringJoiner(" or ", "(", ")").setEmptyValue(""), StringJoiner::add, StringJoiner::merge)
                .toString();

        // access = "(isAuthenticated()) and (allConditions)"
        String access = Arrays.stream(new String[]{authenticationAccess, allConditions})
                .filter(s -> s != null && !s.isEmpty())
                .collect(() -> new StringJoiner(" and ", "(", ")").setEmptyValue(""), StringJoiner::add, StringJoiner::merge)
                .toString();

        String[] patterns = apiPatterns.toArray(new String[]{});

        if (access.isEmpty()) {
            log.trace("Configuring access for URIs {} \"{}\" with no condition", httpMethod, apiPatterns);
            httpSecurity.authorizeHttpRequests(registry ->
                    registry.requestMatchers(httpMethod, patterns).permitAll());
        } else {
            log.trace("Configuring access for URIs {} \"{}\" with this condition : {}", httpMethod, apiPatterns, access);
            httpSecurity.authorizeHttpRequests(registry ->
                    registry.requestMatchers(httpMethod, patterns).access(new WebExpressionAuthorizationManager(access)));
        }
    }

    /**
     * Define new condition that should be closed with {@link Condition#end()}
     */
    public Condition condition() {
        Condition condition = new Condition(this);
        this.conditions.add(condition);
        return condition;
    }

    @RequiredArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public class Condition {

        /**
         * List of authorized permissions
         */
        final Set<NexaWorkPermission> permissions = new HashSet<>();

        /**
         * Refers to a SpEL method expression executed for more precise control.
         */
        String controlMethod;

        /**
         * Parent security rule
         */
        final SecurityRule securityRule;

        public Condition hasPermission(NexaWorkPermission permission) {
            this.permissions.add(permission);
            return this;
        }

        public Condition controlMethod(String controlMethod) {
            this.controlMethod = controlMethod;
            return this;
        }

        public Condition or() {
            return securityRule.condition();
        }

        public SecurityRule end() {
            return securityRule;
        }

        /**
         * Return condition as Spring expression :
         * "(hasAnyAuthority('PERM_1','PERM_2') and controlMethod)"
         */
        private String toFormat() {
            StringJoiner result = new StringJoiner(" and ", "(", ")").setEmptyValue("");
            if (!this.permissions.isEmpty()) {
                String anyAuthorities = this.permissions.stream()
                        .map(permission -> "'" + permission.name() + "'")
                        .collect(Collectors.joining(","));
                result.add("hasAnyAuthority(" + anyAuthorities + ")");
            }
            if (StringUtils.hasText(controlMethod)) {
                result.add(controlMethod);
            }
            return result.toString();
        }
    }
}
