package com.nexawork.meeting.events.publishers;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Publie les événements du Meeting Service sur l'exchange {@code nexawork.events}
 * (§7.1) : {@code call.ended} (Lot 9A) et {@code external.guest.invited} (Lot 9B).
 *
 * <p><b>Publication ASYNCHRONE ({@code @Async}).</b> {@code convertAndSend} est
 * bloquant, et la connexion RabbitMQ est établie <i>paresseusement</i> au premier
 * envoi (plusieurs secondes, davantage si le broker est lent au démarrage). Dans le
 * chemin critique de {@code create()}, cela faisait <b>« pendre » la réponse HTTP</b>
 * jusqu'à ce que la notification parte — l'appel était bien créé, mais le client
 * tournait dans le vide puis affichait « le serveur ne répond pas ». Sorties du
 * thread de la requête, ces publications ne retardent plus jamais une réponse.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MeetingEventPublisher {

    public static final String EXCHANGE = "nexawork.events";
    public static final String ROUTING_CALL_ENDED = "call.ended";
    public static final String ROUTING_GUEST_INVITED = "external.guest.invited";
    public static final String ROUTING_PARTICIPANT_INVITED = "meeting.participant.invited";

    RabbitTemplate rabbitTemplate;

    @Async
    public void publishCallEnded(CallEndedEvent event) {
        publish(ROUTING_CALL_ENDED, event, "appel " + event.callId());
    }

    /**
     * Envoi effectif. {@code @Async} pour les appels <b>cross-bean</b> (celui de
     * {@code notifyInvited} lors de la création d'un appel — le cas qui bloquait) ;
     * un appel interne depuis {@code publishCallEnded} reste dans son propre thread
     * async, ce qui convient tout autant. Toute erreur est absorbée : une
     * notification manquée ne doit jamais faire échouer l'action de l'utilisateur.
     */
    @Async
    public void publish(String routingKey, Object event, String context) {
        try {
            rabbitTemplate.convertAndSend(EXCHANGE, routingKey, event);
            log.info("Event {} publié ({})", routingKey, context);
        } catch (Exception e) {
            log.error("Échec publication {} ({}) : {}", routingKey, context, e.getMessage());
        }
    }
}
