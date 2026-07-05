package com.nexawork.meeting.configurations;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Publisher AMQP du Meeting Service. L'exchange {@code nexawork.events} et les
 * queues sont déclarés par le sidecar rabbitmq-init (§7.4). Le Meeting **publie**
 * {@code call.ended} (→ Messaging + Notification) et {@code external.guest.invited}
 * (→ Notification) ; il ne consomme aucun événement.
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
