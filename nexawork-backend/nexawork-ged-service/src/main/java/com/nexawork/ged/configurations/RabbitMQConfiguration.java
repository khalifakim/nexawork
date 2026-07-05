package com.nexawork.ged.configurations;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.DefaultJackson2JavaTypeMapper;
import org.springframework.amqp.support.converter.Jackson2JavaTypeMapper.TypePrecedence;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * AMQP du GED Service. L'exchange {@code nexawork.events} et la queue
 * {@code nexawork.ged.project-created} sont déclarés par le sidecar
 * rabbitmq-init (§7.4). Le GED **consomme** {@code project.created} ; il ne
 * publie aucun événement.
 */
@Configuration
public class RabbitMQConfiguration {

    public static final String EXCHANGE = "nexawork.events";
    public static final String QUEUE_PROJECT_CREATED = "nexawork.ged.project-created";

    @Bean
    public TopicExchange nexaworkEventsExchange() {
        return new TopicExchange(EXCHANGE, true, false);
    }

    /**
     * Convertisseur JSON en mode {@code INFERRED} : le type de désérialisation est
     * déduit de la signature de la méthode {@code @RabbitListener}, et non du header
     * {@code __TypeId__} (qui porte le FQCN de la classe du Project Service, absente
     * ici). Permet de mapper le payload sur le record local {@code ProjectCreatedEvent}.
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
