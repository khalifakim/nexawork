package com.nexawork.ged.events.publishers;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * Publie les événements du GED Service sur l'exchange topic {@code nexawork.events}
 * (V5.1 §7.1) : {@code document.shared} — la personne avec qui un document est
 * partagé doit être notifiée (§4.7).
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GedEventPublisher {

    public static final String EXCHANGE = "nexawork.events";
    public static final String ROUTING_DOCUMENT_SHARED = "document.shared";

    RabbitTemplate rabbitTemplate;

    public void publishDocumentShared(DocumentSharedEvent event) {
        try {
            rabbitTemplate.convertAndSend(EXCHANGE, ROUTING_DOCUMENT_SHARED, event);
            log.info("Événement {} publié : document « {} » partagé avec {}",
                    ROUTING_DOCUMENT_SHARED, event.documentName(), event.recipientUserId());
        } catch (Exception e) {
            // Une notification manquée ne doit jamais faire échouer le partage.
            log.error("Échec de publication de {} : {}", ROUTING_DOCUMENT_SHARED, e.getMessage());
        }
    }
}
