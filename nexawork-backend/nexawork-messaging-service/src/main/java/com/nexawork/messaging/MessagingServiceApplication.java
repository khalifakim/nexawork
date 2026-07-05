package com.nexawork.messaging;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * NexaWork Messaging Service (port 8083) — canaux (org/projet), conversations
 * directes, messages, mentions, temps réel via WebSocket STOMP (V5.1 §4.5, §12,
 * §13.5, §7.5).
 *
 * <p>Identité via headers Gateway (pas de secret JWT). Consomme
 * {@code project.created} (canaux par défaut) et {@code call.ended} (message
 * système). Scan restreint aux sous-packages commons réutilisables.</p>
 */
@SpringBootApplication(scanBasePackages = {
        "com.nexawork.messaging",
        "com.nexawork.commons.config",
        "com.nexawork.commons.exceptions"
})
@ConfigurationPropertiesScan
public class MessagingServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(MessagingServiceApplication.class, args);
    }
}
