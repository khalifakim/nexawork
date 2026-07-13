package com.nexawork.gateway.security;

import com.nexawork.gateway.security.jwt.JwtTokenValidator;
import io.jsonwebtoken.Claims;
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

import java.util.Optional;

/**
 * Filtre global d'authentification du gateway (V5.1 §14.10).
 *
 * <p>Pour toute requête entrante :</p>
 * <ol>
 *   <li>purge systématiquement les headers d'identité entrants
 *       ({@code X-User-Id}, {@code X-Org-Id}, {@code X-Org-Role}) — anti-spoofing :
 *       un client ne doit jamais pouvoir se les auto-attribuer ;</li>
 *   <li>si le chemin est public ({@link PublicPathMatcher}), laisse passer sans
 *       exiger de token ;</li>
 *   <li>sinon exige un {@code Authorization: Bearer <jwt>} valide — sinon
 *       <b>401</b> ;</li>
 *   <li>en cas de token valide, propage l'identité aux services downstream via
 *       les headers d'identité (les services de confiance lisent ces headers au
 *       lieu de re-valider le JWT).</li>
 * </ol>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private static final String BEARER_PREFIX = "Bearer ";

    public static final String HEADER_USER_ID = "X-User-Id";
    public static final String HEADER_ORG_ID = "X-Org-Id";
    public static final String HEADER_ORG_ROLE = "X-Org-Role";

    private final JwtTokenValidator tokenValidator;
    private final PublicPathMatcher publicPathMatcher;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getRawPath();

        // Anti-spoofing : on repart toujours d'une requête débarrassée des headers
        // d'identité, qu'ils soient légitimes (réinjectés ci-dessous) ou forgés.
        ServerHttpRequest sanitizedRequest = request.mutate()
                .headers(headers -> {
                    headers.remove(HEADER_USER_ID);
                    headers.remove(HEADER_ORG_ID);
                    headers.remove(HEADER_ORG_ROLE);
                })
                .build();

        if (publicPathMatcher.isPublic(path)) {
            // Handshake WebSocket : le navigateur ne peut PAS poser d'en-tête
            // Authorization sur un WebSocket natif. Le chemin reste donc public
            // (jamais de 401 → pas de boucle de reconnexion), mais si un jeton
            // valide accompagne la requête (?access_token=), on propage l'identité
            // en aval : sans elle, les services n'ont aucun Principal de session
            // → le push privé /user/queue/… et la présence Redis restent muets.
            ServerHttpRequest downstream = isWebSocketHandshake(path)
                    ? resolveQueryToken(sanitizedRequest)
                            .flatMap(tokenValidator::validateAndParse)
                            .map(claims -> withIdentityHeaders(sanitizedRequest, claims))
                            .orElse(sanitizedRequest)
                    : sanitizedRequest;
            return chain.filter(exchange.mutate().request(downstream).build());
        }

        Optional<String> bearer = resolveBearerToken(sanitizedRequest);
        if (bearer.isEmpty()) {
            return unauthorized(exchange, "Token d'authentification absent");
        }

        Optional<Claims> claims = tokenValidator.validateAndParse(bearer.get());
        if (claims.isEmpty()) {
            return unauthorized(exchange, "Token d'authentification invalide ou expiré");
        }

        ServerHttpRequest authenticatedRequest = withIdentityHeaders(sanitizedRequest, claims.get());
        return chain.filter(exchange.mutate().request(authenticatedRequest).build());
    }

    private boolean isWebSocketHandshake(String path) {
        return path.startsWith("/ws/");
    }

    /** Jeton porté par la query string — seul canal disponible pour un WebSocket natif. */
    private Optional<String> resolveQueryToken(ServerHttpRequest request) {
        String token = request.getQueryParams().getFirst("access_token");
        return token == null || token.isBlank() ? Optional.empty() : Optional.of(token.trim());
    }

    private Optional<String> resolveBearerToken(ServerHttpRequest request) {
        String header = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length()).trim();
            return token.isEmpty() ? Optional.empty() : Optional.of(token);
        }
        return Optional.empty();
    }

    /**
     * Réinjecte l'identité extraite du JWT. {@code organisationId} et
     * {@code orgRole} sont absents tant qu'aucun workspace actif n'est
     * sélectionné (juste après le register) — les headers correspondants ne sont
     * alors pas ajoutés.
     */
    private ServerHttpRequest withIdentityHeaders(ServerHttpRequest request, Claims claims) {
        String userId = claims.get("userId", String.class);
        String organisationId = claims.get("organisationId", String.class);
        String orgRole = claims.get("orgRole", String.class);

        return request.mutate()
                .headers(headers -> {
                    if (userId != null) {
                        headers.set(HEADER_USER_ID, userId);
                    }
                    if (organisationId != null) {
                        headers.set(HEADER_ORG_ID, organisationId);
                    }
                    if (orgRole != null) {
                        headers.set(HEADER_ORG_ROLE, orgRole);
                    }
                })
                .build();
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String reason) {
        log.debug("401 sur {} : {}", exchange.getRequest().getURI().getRawPath(), reason);
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }

    /**
     * S'exécute avant le routage. Une valeur basse (haute priorité) garantit que
     * l'authentification précède tout autre filtre applicatif.
     */
    @Override
    public int getOrder() {
        return -100;
    }
}
