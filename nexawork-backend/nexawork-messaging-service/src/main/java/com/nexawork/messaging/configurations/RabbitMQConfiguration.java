package com.nexawork.messaging.configurations;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.DefaultJackson2JavaTypeMapper;
import org.springframework.amqp.support.converter.Jackson2JavaTypeMapper.TypePrecedence;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * AMQP du Messaging Service. L'exchange {@code nexawork.events} et les queues
 * {@code nexawork.messaging.project-created} / {@code nexawork.messaging.call-ended}
 * sont déclarés par le sidecar rabbitmq-init (§7.4). Le Messaging **consomme**
 * {@code project.created} (canaux par défaut) et {@code call.ended} (message
 * système) ; il ne publie aucun événement.
 */
@Configuration
public class RabbitMQConfiguration {

    public static final String EXCHANGE = "nexawork.events";
    public static final String QUEUE_PROJECT_CREATED = "nexawork.messaging.project-created";
    public static final String QUEUE_CALL_ENDED = "nexawork.messaging.call-ended";

    @Bean
    public TopicExchange nexaworkEventsExchange() {
        return new TopicExchange(EXCHANGE, true, false);
    }

    /**
     * Convertisseur JSON en mode {@code INFERRED} : le type est déduit de la
     * signature du {@code @RabbitListener} et non du header {@code __TypeId__}
     * (FQCN d'une classe d'un autre service, absente ici).
     */
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
