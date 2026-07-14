package com.nexawork.messaging.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/**
 * « Quelqu'un vient de publier dans un canal » — signal temps réel destiné à la
 * cloche du frontend (V5.1 §4.7). Distinct du message lui-même, qui n'est diffusé
 * qu'aux abonnés du canal ouvert ({@code /topic/channels/{id}}) : sans ce signal,
 * un utilisateur qui n'a pas le canal à l'écran n'apprend rien.
 *
 * <p><b>Non persisté.</b> Le Messaging ne connaît pas les membres d'un canal
 * <i>public</i> (la composition des projets appartient au Project Service) : il ne
 * peut donc pas dresser la liste des destinataires qu'exigerait une notification
 * en base, une par personne. On diffuse donc un signal volatile — et on ne l'invente
 * pas.</p>
 */
@Data
@Builder
public class ChannelActivityEvent {

    private UUID messageId;
    private UUID channelId;
    private String channelName;
    private UUID authorUserId;
    private String authorDisplayName;
    /** Début du message — affiché sous la notification. */
    private String excerpt;
}
