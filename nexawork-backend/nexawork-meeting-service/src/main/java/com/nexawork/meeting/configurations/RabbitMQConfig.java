package com.nexawork.meeting.configurations;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    public static final String EXCHANGE               = "nexawork.events";
    public static final String Q_CALL_ENDED           = "nexawork.notification.call-ended";
    public static final String Q_EXTERNAL_GUEST       = "nexawork.notification.external-guest";

    @Bean TopicExchange exchange() { return new TopicExchange(EXCHANGE, true, false); }
    @Bean Queue qCallEnded()       { return new Queue(Q_CALL_ENDED, true); }
    @Bean Queue qExternalGuest()   { return new Queue(Q_EXTERNAL_GUEST, true); }

    @Bean Binding bindCallEnded(Queue qCallEnded, TopicExchange exchange) {
        return BindingBuilder.bind(qCallEnded).to(exchange).with("call.ended");
    }
    @Bean Binding bindExternalGuest(Queue qExternalGuest, TopicExchange exchange) {
        return BindingBuilder.bind(qExternalGuest).to(exchange).with("external.guest.invited");
    }

    @Bean Jackson2JsonMessageConverter messageConverter() { return new Jackson2JsonMessageConverter(); }

    @Bean RabbitTemplate rabbitTemplate(ConnectionFactory cf) {
        RabbitTemplate rt = new RabbitTemplate(cf);
        rt.setMessageConverter(messageConverter());
        return rt;
    }
}
