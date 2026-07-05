package com.nexawork.notification.security;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;

/**
 * Handshake WebSocket : associe l'identité (header {@code X-User-Id} injecté par
 * la Gateway sur la requête d'upgrade) à un {@link Principal} de session, afin que
 * le push privé {@code convertAndSendToUser(userId, "/queue/notifications", …)}
 * atteigne le bon utilisateur (V5.1 §7.5, §13.7).
 */
@Component
public class NotificationHandshakeInterceptor implements HandshakeInterceptor {

    public static final String ATTR_USER_ID = "userId";

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String userId = firstHeader(request, "X-User-Id");
        if (userId != null) {
            attributes.put(ATTR_USER_ID, userId);
        }
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // rien
    }

    /**
     * Handshake handler qui dérive le Principal de session depuis {@code X-User-Id}.
     * Le nom du Principal = userId → cible du user-destination {@code /user/{userId}/queue/…}.
     */
    public DefaultHandshakeHandler principalHandshakeHandler() {
        return new DefaultHandshakeHandler() {
            @Override
            protected Principal determineUser(ServerHttpRequest request,
                                              WebSocketHandler wsHandler, Map<String, Object> attributes) {
                String userId = firstHeader(request, "X-User-Id");
                if (userId == null && attributes.get(ATTR_USER_ID) != null) {
                    userId = attributes.get(ATTR_USER_ID).toString();
                }
                final String name = userId;
                return name != null ? () -> name : super.determineUser(request, wsHandler, attributes);
            }
        };
    }

    private String firstHeader(ServerHttpRequest request, String header) {
        var values = request.getHeaders().get(header);
        return values != null && !values.isEmpty() ? values.get(0) : null;
    }
}
