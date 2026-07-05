package com.nexawork.notification.configurations;

import com.nexawork.notification.security.NotificationHandshakeInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket STOMP pour le push de notifications (V5.1 §7.5, §13.7). Endpoint
 * {@code /ws/notifications} (chemin effectif sous context-path :
 * {@code /nexawork-notification-api-v1/ws/notifications}). Push privé par
 * utilisateur sur {@code /user/queue/notifications}.
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfiguration implements WebSocketMessageBrokerConfigurer {

    private final NotificationHandshakeInterceptor handshakeInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/notifications")
                .addInterceptors(handshakeInterceptor)
                .setHandshakeHandler(handshakeInterceptor.principalHandshakeHandler())
                .setAllowedOriginPatterns("*")
                .withSockJS();
        registry.addEndpoint("/ws/notifications")
                .addInterceptors(handshakeInterceptor)
                .setHandshakeHandler(handshakeInterceptor.principalHandshakeHandler())
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }
}
