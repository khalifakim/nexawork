package com.nexawork.gateway.security;

import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;

import java.util.List;

/**
 * Liste blanche des chemins accessibles SANS JWT.
 *
 * <p>Regroupe les endpoints d'authentification anonymes de l'Auth Service
 * (V5.1 §13.1 : login, register, refresh, cycle mot de passe, vérification
 * email, consultation d'une invitation par son token), plus les sondes
 * techniques (actuator) et la documentation OpenAPI.</p>
 *
 * <p>Les chemins sont exprimés avec le préfixe de context-path du service cible
 * ({@code /nexawork-auth-api-v1/...}), tel que reçu par le gateway avant
 * routage.</p>
 */
@Component
public class PublicPathMatcher {

    private static final AntPathMatcher MATCHER = new AntPathMatcher();

    private static final List<String> PUBLIC_PATHS = List.of(
            // ─── Auth Service : endpoints anonymes (§13.1) ───
            "/nexawork-auth-api-v1/api/v1/auth/register",
            "/nexawork-auth-api-v1/api/v1/auth/login",
            "/nexawork-auth-api-v1/api/v1/auth/refresh",
            "/nexawork-auth-api-v1/api/v1/auth/logout",
            "/nexawork-auth-api-v1/api/v1/auth/password/reset-request",
            "/nexawork-auth-api-v1/api/v1/auth/password/reset",
            "/nexawork-auth-api-v1/api/v1/auth/verify-email",
            // Confirmation d'un changement d'email par token (page publique côté front)
            "/nexawork-auth-api-v1/api/v1/auth/email/confirm-change",
            // Consultation d'une invitation par son token (page publique côté front)
            "/nexawork-auth-api-v1/api/v1/invitations/*",
            // Acceptation d'une invitation (création de compte) par token — deux
            // segments : le motif '*' ci-dessus ne matche qu'un seul segment.
            "/nexawork-auth-api-v1/api/v1/invitations/*/accept",

            // ─── Meeting Service : accès invité externe par token (V5.1 §4.6) ───
            // L'invité n'a pas de compte : il présente son token à usage unique,
            // validé côté service. Page publique /guest/{token} côté front.
            "/nexawork-meeting-api-v1/api/v1/guest/*",
            // ⚠️ `*` ne matche QU'UN SEUL segment (AntPathMatcher) : sans ces lignes,
            // /guest/{token}/files partirait en 401 — le même piège que
            // /invitations/{token}/accept, déjà payé une fois.
            // Fichiers partagés (M5) : l'invité voit et partage comme un membre.
            "/nexawork-meeting-api-v1/api/v1/guest/*/files",
            "/nexawork-meeting-api-v1/api/v1/guest/*/files/*/download",

            // ─── Handshake WebSocket STOMP (messaging + notifications) ───
            // Le navigateur ne peut PAS poser d'en-tête Authorization sur un
            // WebSocket natif : le handshake HTTP doit donc être public. L'identité
            // est établie plus bas, à la trame STOMP CONNECT (lue par le
            // WebSocketHandshakeInterceptor de chaque service). Sans cette entrée,
            // le filtre JWT rejette le handshake en 401 → reconnexion en boucle.
            "/ws/**",

            // ─── Sondes techniques + OpenAPI (tous services) ───
            "/*/actuator/health/**",
            "/*/actuator/info",
            "/*/v3/api-docs/**",
            "/*/swagger-ui/**",
            "/*/swagger-ui.html",
            // Health propre du gateway
            "/actuator/health/**",
            "/actuator/info"
    );

    /**
     * @return {@code true} si le chemin de la requête est public (pas de JWT exigé).
     */
    public boolean isPublic(String path) {
        return PUBLIC_PATHS.stream().anyMatch(pattern -> MATCHER.match(pattern, path));
    }
}
