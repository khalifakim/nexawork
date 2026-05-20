package com.nexawork.auth.configurations;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "nexawork.events";
    public static final String QUEUE_MEMBER_INVITED = "nexawork.notification.member-invited";
    public static final String ROUTING_MEMBER_INVITED = "member.invited";

    @Bean
    public TopicExchange nexaworkExchange() {
        return new TopicExchange(EXCHANGE_NAME, true, false);
    }

    @Bean
    public Queue memberInvitedQueue() {
        return QueueBuilder.durable(QUEUE_MEMBER_INVITED).build();
    }

    @Bean
    public Binding memberInvitedBinding() {
        return BindingBuilder
            .bind(memberInvitedQueue())
            .to(nexaworkExchange())
            .with(ROUTING_MEMBER_INVITED);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }
}
