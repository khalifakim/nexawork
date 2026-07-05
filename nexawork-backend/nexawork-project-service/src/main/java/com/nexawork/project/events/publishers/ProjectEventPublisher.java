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
    public static final String ROUTING_TASK_ASSIGNED = "task.assigned";
    public static final String ROUTING_LIVRABLE_VALIDATED = "livrable.validated";

    RabbitTemplate rabbitTemplate;

    public void publishProjectCreated(ProjectCreatedEvent event) {
        publish(ROUTING_PROJECT_CREATED, event, "projet " + event.projectId());
    }

    public void publishTaskAssigned(TaskAssignedEvent event) {
        publish(ROUTING_TASK_ASSIGNED, event, "tâche " + event.taskId() + " → " + event.assigneeUserId());
    }

    public void publishLivrableValidated(LivrableValidatedEvent event) {
        publish(ROUTING_LIVRABLE_VALIDATED, event, "livrable " + event.taskId());
    }

    private void publish(String routingKey, Object event, String context) {
        try {
            rabbitTemplate.convertAndSend(EXCHANGE, routingKey, event);
            log.info("Event {} publié ({})", routingKey, context);
        } catch (Exception e) {
            // La publication d'event ne doit jamais faire échouer l'opération métier.
            log.error("Échec de publication {} ({}) : {}", routingKey, context, e.getMessage());
        }
    }
}
