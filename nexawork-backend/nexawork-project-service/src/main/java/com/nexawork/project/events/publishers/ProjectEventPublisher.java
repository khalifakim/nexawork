package com.nexawork.project.events.publishers;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * Publie les événements du Project Service sur l'exchange topic
 * {@code nexawork.events} (V5.1 §7.1) : {@code project.created} (Lot 4B),
 * {@code task.assigned} et {@code livrable.validated} (Lot 4D).
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProjectEventPublisher {

    public static final String EXCHANGE = "nexawork.events";
    public static final String ROUTING_PROJECT_CREATED = "project.created";

    RabbitTemplate rabbitTemplate;

    public void publishProjectCreated(ProjectCreatedEvent event) {
        try {
            rabbitTemplate.convertAndSend(EXCHANGE, ROUTING_PROJECT_CREATED, event);
            log.info("Event project.created publié pour projet {} ({})",
                    event.projectId(), event.projectName());
        } catch (Exception e) {
            // La publication d'event ne doit pas faire échouer la création du projet
            log.error("Échec de publication project.created pour projet {} : {}",
                    event.projectId(), e.getMessage());
        }
    }
}
