package com.nexawork.messaging.services;

import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.messaging.dtos.requests.SendMessageRequest;
import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.entities.Message;
import com.nexawork.messaging.entities.MessageAttachment;
import com.nexawork.messaging.entities.MessageMention;
import com.nexawork.messaging.mappers.MessageMapper;
import com.nexawork.messaging.repositories.MessageMentionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.util.List;
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

    /** Extrait et enregistre les mentions du contenu (à l'envoi). */
    public void persistMentions(Message message) {
        List<MentionParser.ParsedMention> parsed = mentionParser.parse(message.getContent());
        for (MentionParser.ParsedMention m : parsed) {
            mentionRepository.save(MessageMention.builder()
                    .message(message)
                    .mentionType(m.type())
                    .targetText(m.targetText())
                    .isRead(false)
                    .build());
        }
    }

    /** Assemble un MessageResponse avec ses mentions. */
    public MessageResponse toDto(Message message) {
        MessageResponse dto = messageMapper.asDto(message);
        dto.setMentions(messageMapper.parseMentions(mentionRepository.findByMessageId(message.getId())));
        return dto;
    }
}
