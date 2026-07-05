package com.nexawork.messaging.configurations;

import com.nexawork.messaging.security.WebSocketHandshakeInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configuration WebSocket STOMP (V5.1 §7.5). Broker simple en mémoire (dev) —
 * le relais RabbitMQ STOMP relève de la prod. Endpoint : {@code /ws/messaging}
 * (chemin effectif sous context-path : {@code /nexawork-messaging-api-v1/ws/messaging}).
 *
 * <p>Topics de diffusion : {@code /topic/channels/{id}} et
 * {@code /topic/conversations/{id}}. Destinations entrantes préfixées {@code /app}.</p>
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfiguration implements WebSocketMessageBrokerConfigurer {

    private final WebSocketHandshakeInterceptor handshakeInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/messaging")
                .addInterceptors(handshakeInterceptor)
                .setAllowedOriginPatterns("*")
                .withSockJS();
        // Endpoint natif (sans SockJS) pour les clients STOMP purs.
        registry.addEndpoint("/ws/messaging")
                .addInterceptors(handshakeInterceptor)
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }
}
