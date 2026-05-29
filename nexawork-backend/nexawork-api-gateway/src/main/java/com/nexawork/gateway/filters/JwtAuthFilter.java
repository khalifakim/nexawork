package com.nexawork.gateway.filters;

import com.nexawork.gateway.properties.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import io.jsonwebtoken.io.Decoders;

import javax.crypto.SecretKey;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter implements GlobalFilter, Ordered {

    private static final List<String> PUBLIC_PATHS = List.of(
        // Auth — endpoints publics
        "/nexawork-auth-api-v1/api/v1/auth/login",
        "/nexawork-auth-api-v1/api/v1/auth/register",
        "/nexawork-auth-api-v1/api/v1/auth/refresh",
        "/nexawork-auth-api-v1/api/v1/organisations/invitations/accept",
        // Swagger UI — tous les services
        "/nexawork-auth-api-v1/swagger-ui",
        "/nexawork-auth-api-v1/v3/api-docs",
        "/nexawork-project-api-v1/swagger-ui",
        "/nexawork-project-api-v1/v3/api-docs",
        "/nexawork-messaging-api-v1/swagger-ui",
        "/nexawork-messaging-api-v1/v3/api-docs",
        "/nexawork-meeting-api-v1/swagger-ui",
        "/nexawork-meeting-api-v1/v3/api-docs",
        "/nexawork-notification-api-v1/swagger-ui",
        "/nexawork-notification-api-v1/v3/api-docs",
        "/nexawork-file-api-v1/swagger-ui",
        "/nexawork-file-api-v1/v3/api-docs",
        "/nexawork-ged-api-v1/swagger-ui",
        "/nexawork-ged-api-v1/v3/api-docs",
        // Actuator
        "/actuator"
    );

    private final JwtProperties jwtProperties;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();

        if (PUBLIC_PATHS.stream().anyMatch(path::startsWith)) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = parseClaims(token);

            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header("X-User-Id",          safeStr(claims.get("userId")))
                .header("X-User-Email",        claims.getSubject())
                .header("X-Organisation-Id",   safeStr(claims.get("organisationId")))
                .header("X-User-Role",         safeStr(claims.get("orgRole")))
                .header("X-User-Display-Name", safeStr(claims.get("displayName")))
                .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build());

        } catch (JwtException | IllegalArgumentException e) {
            log.warn("JWT invalide : {}", e.getMessage());
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
    }

    private Claims parseClaims(String token) {
        byte[] keyBytes = Decoders.BASE64.decode(jwtProperties.getBase64Secret());
        SecretKey key = Keys.hmacShaKeyFor(keyBytes);
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private String safeStr(Object value) {
        return value == null ? "" : value.toString();
    }

    @Override
    public int getOrder() {
        return -100;
    }
}
