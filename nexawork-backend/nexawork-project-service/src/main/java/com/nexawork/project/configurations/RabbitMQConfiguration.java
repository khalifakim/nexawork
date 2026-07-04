package com.nexawork.project.configurations;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Publisher AMQP du Project Service. L'exchange {@code nexawork.events} et les
 * queues sont déclarés par le sidecar rabbitmq-init (§E.1) — le bean exchange
 * est uniquement défensif (idempotent). Le Project Service publie
 * {@code project.created}, {@code task.assigned}, {@code livrable.validated}
 * (V5.1 §7.2) ; il ne consomme aucun événement.
 */
@Configuration
public class RabbitMQConfiguration {

    public static final String EXCHANGE = "nexawork.events";

    @Bean
    public TopicExchange nexaworkEventsExchange() {
        return new TopicExchange(EXCHANGE, true, false);
    }

    @Bean
    public Jackson2JsonMessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         Jackson2JsonMessageConverter converter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(converter);
        return template;
    }
}
