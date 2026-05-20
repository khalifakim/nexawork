package com.nexawork.project.events.publishers;

import com.nexawork.project.configurations.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProjectEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishProjectCreated(ProjectCreatedEvent event) {
        publish("project.created", event);
    }

    public void publishTaskAssigned(TaskAssignedEvent event) {
        publish("task.assigned", event);
    }

    public void publishFileAttached(FileAttachedToTaskEvent event) {
        publish("file.attached.to.task", event);
    }

    public void publishLivrableValidated(LivrableValidatedEvent event) {
        publish("livrable.validated", event);
    }

    private void publish(String routingKey, Object event) {
        log.info("Publishing event [{}]: {}", routingKey, event);
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, routingKey, event);
    }
}
