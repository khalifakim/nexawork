package com.nexawork.auth.configurations;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Publisher AMQP de l'Auth Service. L'exchange `nexawork.events` et les queues
 * sont déclarés par le sidecar rabbitmq-init (§E.1) — le bean exchange est
 * uniquement défensif (idempotent), aucune queue n'est déclarée ici.
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
