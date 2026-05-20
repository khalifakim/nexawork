package com.nexawork.notification.configurations;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE                = "nexawork.events";
    public static final String Q_MEMBER_INVITED        = "nexawork.notification.member-invited";
    public static final String Q_TASK_ASSIGNED         = "nexawork.notification.task-assigned";
    public static final String Q_LIVRABLE_VALIDATED    = "nexawork.notification.livrable-validated";
    public static final String Q_CALL_ENDED            = "nexawork.notification.call-ended";
    public static final String Q_EXTERNAL_GUEST        = "nexawork.notification.external-guest";

    @Bean TopicExchange exchange()          { return new TopicExchange(EXCHANGE, true, false); }
    @Bean Queue qMemberInvited()           { return new Queue(Q_MEMBER_INVITED, true); }
    @Bean Queue qTaskAssigned()            { return new Queue(Q_TASK_ASSIGNED, true); }
    @Bean Queue qLivrableValidated()       { return new Queue(Q_LIVRABLE_VALIDATED, true); }
    @Bean Queue qCallEnded()               { return new Queue(Q_CALL_ENDED, true); }
    @Bean Queue qExternalGuest()           { return new Queue(Q_EXTERNAL_GUEST, true); }

    @Bean Binding bindMemberInvited(Queue qMemberInvited, TopicExchange exchange) {
        return BindingBuilder.bind(qMemberInvited).to(exchange).with("member.invited");
    }
    @Bean Binding bindTaskAssigned(Queue qTaskAssigned, TopicExchange exchange) {
        return BindingBuilder.bind(qTaskAssigned).to(exchange).with("task.assigned");
    }
    @Bean Binding bindLivrableValidated(Queue qLivrableValidated, TopicExchange exchange) {
        return BindingBuilder.bind(qLivrableValidated).to(exchange).with("livrable.validated");
    }
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
