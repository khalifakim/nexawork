package com.nexawork.messaging.services;

import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.messaging.dtos.requests.SendMessageRequest;
import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.entities.Message;
import com.nexawork.messaging.entities.MessageAttachment;
import com.nexawork.messaging.entities.MessageMention;
import com.nexawork.messaging.entities.enums.MentionType;
import com.nexawork.messaging.events.publishers.MessageCreatedEvent;
import com.nexawork.messaging.events.publishers.MessageMentionEvent;
import com.nexawork.messaging.events.publishers.MessagingEventPublisher;
import com.nexawork.messaging.mappers.MessageMapper;
import com.nexawork.messaging.repositories.MessageMentionRepository;
import com.nexawork.messaging.security.CallerContext;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Persiste les mentions extraites d'un message et assemble le {@link MessageResponse}
 * (message + mentions). Mutualisé entre messages de canaux et de conversations.
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MessageAssembler {

    MentionParser mentionParser;
    MessageMentionRepository mentionRepository;
    MessageMapper messageMapper;
    MessagingEventPublisher eventPublisher;
    CallerContext caller;

    /**
     * Valide qu'un message est envoyable : il doit porter du texte OU au moins une
     * pièce jointe (le contenu seul n'est plus obligatoire depuis le multi-fichiers).
     */
    public void requireSendable(SendMessageRequest request) {
        boolean hasContent = request.getContent() != null && !request.getContent().isBlank();
        boolean hasAttachment =
                (request.getAttachments() != null && request.getAttachments().stream()
                        .anyMatch(a -> a.getUrl() != null && !a.getUrl().isBlank()))
                || (request.getAttachmentUrl() != null && !request.getAttachmentUrl().isBlank());
        if (!hasContent && !hasAttachment) {
            throw new InvalidRequestException("Le message doit contenir du texte ou au moins une pièce jointe.");
        }
    }

    /**
     * Rattache au message les pièces jointes de la requête (forme multiple V2 ;
     * repli sur la forme mono-pièce héritée). À appeler avant la sauvegarde
     * (cascade). {@code content} vide est toléré si des fichiers sont présents.
     */
    public void applyAttachments(Message message, SendMessageRequest request, UUID uploaderId) {
        if (request.getAttachments() != null) {
            for (SendMessageRequest.AttachmentInput a : request.getAttachments()) {
                if (a.getUrl() == null || a.getUrl().isBlank()) {
                    continue;
                }
                message.addAttachment(MessageAttachment.builder()
                        .fileUrl(a.getUrl())
                        .fileName(a.getName())
                        .uploaderUserId(uploaderId)
                        .build());
            }
        }
        // Forme héritée : une seule pièce jointe (si aucune n'a été ajoutée ci-dessus).
        if (message.getAttachments().isEmpty()
                && request.getAttachmentUrl() != null && !request.getAttachmentUrl().isBlank()) {
            message.addAttachment(MessageAttachment.builder()
                    .fileUrl(request.getAttachmentUrl())
                    .fileName(request.getAttachmentName())
                    .uploaderUserId(uploaderId)
                    .build());
        }
    }

    /**
     * Extrait et enregistre les mentions du contenu (à l'envoi), en leur attachant
     * la **cible réelle** ({@code targetId}) fournie par le client.
     *
     * <p>Le <b>contenu</b> reste la source de vérité sur ce qui est mentionné :
     * on ne persiste que ce que le parser trouve dans le texte. La requête ne
     * fait qu'apporter l'identifiant que le Messaging ne peut pas résoudre seul
     * (utilisateurs, tâches, documents et canaux appartiennent à d'autres
     * domaines). Sans lui, {@code targetId} restait nul : la vue « Mentions
     * reçues » (§5.3) ne trouvait jamais personne et aucune notification de
     * mention ne pouvait partir.</p>
     *
     * @return les mentions persistées (pour la publication des notifications)
     */
    public List<MessageMention> persistMentions(Message message, SendMessageRequest request) {
        Map<String, UUID> targets = targetsByKey(request);
        List<MessageMention> saved = new ArrayList<>();
        for (MentionParser.ParsedMention m : mentionParser.parse(message.getContent())) {
            saved.add(mentionRepository.save(MessageMention.builder()
                    .message(message)
                    .mentionType(m.type())
                    .targetId(targets.get(key(m.type(), m.targetText())))
                    .targetText(m.targetText())
                    .isRead(false)
                    .build()));
        }
        return saved;
    }

    /**
     * Les mentions ne déclenchent plus de notification « cloche ». Elles sont déjà
     * regroupées et affichées dans la page dédiée « Mentions reçues » (§5.1), qui lit
     * les entités de mention persistées (indépendamment des notifications). On évite
     * ainsi le doublon cloche / page Mentions. La persistance des mentions reste
     * assurée par {@code persistMentions} — seul l'envoi de la cloche est retiré.
     */
    public void notifyMentioned(Message message, List<MessageMention> mentions,
                                UUID channelId, String channelName, UUID conversationId) {
        // Volontairement vide : voir le Javadoc ci-dessus (mentions → page dédiée, pas de cloche).
    }

    /**
     * Notifie les destinataires d'un nouveau message (§4.7) : conversation directe
     * (l'autre participant) ou canal privé (ses membres, hors auteur). Aucun envoi
     * si la liste est vide (canal public : {@code recipients} vide → pas de cloche).
     */
    public void notifyNewMessage(Message message, List<UUID> recipients,
                                 UUID channelId, String channelName, UUID conversationId) {
        if (recipients == null || recipients.isEmpty()) {
            return;
        }
        eventPublisher.publishMessageCreated(new MessageCreatedEvent(
                message.getId(), recipients, message.getSenderUserId(), caller.displayName(),
                caller.organisationId(), excerpt(message.getContent()),
                channelId, channelName, conversationId));
    }

    /** Extrait affiché sous la notification — exposé aux appelants (activité de canal). */
    public String excerptOf(String content) {
        return excerpt(content);
    }

    /** Extrait affiché sous la notification (le contenu peut être long). */
    private String excerpt(String content) {
        if (content == null) {
            return "";
        }
        String trimmed = content.trim();
        return trimmed.length() <= 140 ? trimmed : trimmed.substring(0, 137) + "…";
    }

    /** Index des cibles fournies par le client, par (type, libellé normalisé). */
    private Map<String, UUID> targetsByKey(SendMessageRequest request) {
        Map<String, UUID> targets = new HashMap<>();
        if (request.getMentions() == null) {
            return targets;
        }
        for (SendMessageRequest.MentionInput m : request.getMentions()) {
            if (m.getType() != null && m.getTargetId() != null && m.getTargetText() != null) {
                targets.put(key(m.getType(), m.getTargetText()), m.getTargetId());
            }
        }
        return targets;
    }

    /**
     * Clé de rapprochement texte↔cible. Le libellé saisi peut porter des espaces
     * insécables (le composeur les utilise pour qu'une mention en plusieurs mots
     * reste un seul token) : on normalise avant de comparer.
     */
    private String key(MentionType type, String targetText) {
        return type + ":" + targetText.replace(' ', ' ').trim().toLowerCase();
    }

    /** Assemble un MessageResponse avec ses mentions. */
    public MessageResponse toDto(Message message) {
        MessageResponse dto = messageMapper.asDto(message);
        dto.setMentions(messageMapper.parseMentions(mentionRepository.findByMessageId(message.getId())));
        return dto;
    }
}
