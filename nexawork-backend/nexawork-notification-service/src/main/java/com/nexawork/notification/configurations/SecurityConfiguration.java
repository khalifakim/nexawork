package com.nexawork.notification.configurations;

import com.nexawork.notification.security.GatewayIdentityFilter;
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
 * Sécurité du Notification Service (stateless). Identité via headers Gateway.
 * Le handshake WebSocket ({@code /ws/notifications/**}) est ouvert (identité lue
 * par l'interceptor de handshake).
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
                                "/ws/notifications/**",
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
