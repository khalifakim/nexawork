package com.nexawork.auth.events.publishers;

import com.nexawork.auth.configurations.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MemberInvitedEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publish(MemberInvitedEvent event) {
        rabbitTemplate.convertAndSend(
            RabbitMQConfig.EXCHANGE_NAME,
            RabbitMQConfig.ROUTING_MEMBER_INVITED,
            event
        );
        log.info("Event member.invited publié pour : {}", event.inviteeEmail());
    }
}
