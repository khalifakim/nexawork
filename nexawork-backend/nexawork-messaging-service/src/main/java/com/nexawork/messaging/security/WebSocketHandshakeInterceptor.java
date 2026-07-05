package com.nexawork.messaging.security;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Récupère l'identité propagée par l'API Gateway sur la requête d'upgrade
 * WebSocket ({@code X-User-Id} / {@code X-Org-Id} / {@code X-Org-Role}) et la place
 * dans les attributs de session STOMP, pour usage ultérieur (autorisation
 * d'abonnement/envoi côté serveur).
 *
 * <p>En dev, la diffusion se fait sur des topics publics ; l'autorisation
 * d'<b>envoi</b> reste vérifiée côté REST (REF D/F). Cet interceptor rend
 * l'identité disponible pour un durcissement ultérieur du filtrage d'abonnement.</p>
 */
@Component
public class WebSocketHandshakeInterceptor implements HandshakeInterceptor {

    public static final String ATTR_USER_ID = "userId";
    public static final String ATTR_ORG_ID = "organisationId";
    public static final String ATTR_ORG_ROLE = "orgRole";

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        putHeader(request, attributes, "X-User-Id", ATTR_USER_ID);
        putHeader(request, attributes, "X-Org-Id", ATTR_ORG_ID);
        putHeader(request, attributes, "X-Org-Role", ATTR_ORG_ROLE);
        return true; // handshake toujours accepté ; l'identité (si présente) est mémorisée
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // rien
    }

    private void putHeader(ServerHttpRequest request, Map<String, Object> attributes, String header, String attr) {
        var values = request.getHeaders().get(header);
        if (values != null && !values.isEmpty()) {
            attributes.put(attr, values.get(0));
        }
    }
}
