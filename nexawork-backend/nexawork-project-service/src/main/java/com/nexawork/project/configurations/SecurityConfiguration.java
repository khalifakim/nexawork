package com.nexawork.project.configurations;

import com.nexawork.project.security.GatewayIdentityFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Sécurité du Project Service (Spring Boot 3.5, stateless).
 *
 * <p>Le service ne re-valide pas le JWT : il fait confiance à l'API Gateway et
 * lit l'identité déposée dans les headers via {@link GatewayIdentityFilter}.
 * Les endpoints techniques (actuator, OpenAPI) sont publics ; tout le reste
 * exige une identité (401 sinon). L'autorisation fine (règles REF/R) est
 * appliquée en couche service.</p>
 */
@Configuration
@EnableWebSecurity
@Profile("!test")
@EnableMethodSecurity(prePostEnabled = true, securedEnabled = true)
public class SecurityConfiguration {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .httpBasic(httpBasic -> httpBasic.disable())
                .csrf(csrf -> csrf.disable())
                .formLogin(form -> form.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(new GatewayIdentityFilter(), UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(registry -> registry
                        .requestMatchers(
                                "/v3/api-docs",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/swagger-resources/**",
                                "/webjars/**",
                                "/actuator/**")
                        .permitAll()
                        .anyRequest().authenticated());
        return http.build();
    }
}
