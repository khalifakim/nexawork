package com.nexawork.notification.configurations;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.DefaultJackson2JavaTypeMapper;
import org.springframework.amqp.support.converter.Jackson2JavaTypeMapper.TypePrecedence;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * AMQP du Notification Service. Les 5 queues (§7.4) sont déclarées par le sidecar
 * rabbitmq-init. Le service **consomme** {@code member.invited}, {@code task.assigned},
 * {@code livrable.validated}, {@code call.ended}, {@code external.guest.invited} ;
 * il ne publie aucun événement.
 */
@Configuration
public class RabbitMQConfiguration {

    public static final String EXCHANGE = "nexawork.events";

    @Bean
    public TopicExchange nexaworkEventsExchange() {
        return new TopicExchange(EXCHANGE, true, false);
    }

    @Bean
    public MessageConverter jacksonMessageConverter() {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter();
        DefaultJackson2JavaTypeMapper typeMapper = new DefaultJackson2JavaTypeMapper();
        typeMapper.setTypePrecedence(TypePrecedence.INFERRED);
        typeMapper.setTrustedPackages("*");
        converter.setJavaTypeMapper(typeMapper);
        return converter;
    }
}
