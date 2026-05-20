package com.nexawork.project.configurations;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "nexawork.events";

    public static final String Q_TASK_ASSIGNED      = "nexawork.notification.task-assigned";
    public static final String Q_PROJECT_CREATED    = "nexawork.ged.project-created";
    public static final String Q_FILE_ATTACHED      = "nexawork.ged.file-attached-to-task";
    public static final String Q_LIVRABLE_VALIDATED = "nexawork.notification.livrable-validated";

    @Bean TopicExchange exchange() { return new TopicExchange(EXCHANGE, true, false); }

    @Bean Queue qTaskAssigned()      { return new Queue(Q_TASK_ASSIGNED, true); }
    @Bean Queue qProjectCreated()    { return new Queue(Q_PROJECT_CREATED, true); }
    @Bean Queue qFileAttached()      { return new Queue(Q_FILE_ATTACHED, true); }
    @Bean Queue qLivrableValidated() { return new Queue(Q_LIVRABLE_VALIDATED, true); }

    @Bean Binding bindTaskAssigned(Queue qTaskAssigned, TopicExchange exchange) {
        return BindingBuilder.bind(qTaskAssigned).to(exchange).with("task.assigned");
    }
    @Bean Binding bindProjectCreated(Queue qProjectCreated, TopicExchange exchange) {
        return BindingBuilder.bind(qProjectCreated).to(exchange).with("project.created");
    }
    @Bean Binding bindFileAttached(Queue qFileAttached, TopicExchange exchange) {
        return BindingBuilder.bind(qFileAttached).to(exchange).with("file.attached.to.task");
    }
    @Bean Binding bindLivrableValidated(Queue qLivrableValidated, TopicExchange exchange) {
        return BindingBuilder.bind(qLivrableValidated).to(exchange).with("livrable.validated");
    }

    @Bean Jackson2JsonMessageConverter messageConverter() { return new Jackson2JsonMessageConverter(); }

    @Bean RabbitTemplate rabbitTemplate(ConnectionFactory cf) {
        RabbitTemplate rt = new RabbitTemplate(cf);
        rt.setMessageConverter(messageConverter());
        return rt;
    }
}
