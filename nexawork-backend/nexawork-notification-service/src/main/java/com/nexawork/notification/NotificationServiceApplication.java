package com.nexawork.notification;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * NexaWork Notification Service (port 8085) — consomme les événements RabbitMQ de
 * tous les services, crée des notifications in-app, pousse en temps réel via
 * WebSocket (`/user/queue/notifications`), gère la présence Redis et le Web Push
 * VAPID (V5.1 §4.7, §7.5, §13.7).
 *
 * <p>Identité via headers Gateway (pas de secret JWT). {@code @EnableAsync} pour
 * l'envoi email/push non bloquant.</p>
 */
@SpringBootApplication(scanBasePackages = {
        "com.nexawork.notification",
        "com.nexawork.commons.config",
        "com.nexawork.commons.exceptions"
})
@ConfigurationPropertiesScan
@EnableAsync
public class NotificationServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(NotificationServiceApplication.class, args);
    }
}
