package com.nexawork.messaging.services;

import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.entities.Message;
import com.nexawork.messaging.entities.MessageMention;
import com.nexawork.messaging.mappers.MessageMapper;
import com.nexawork.messaging.repositories.MessageMentionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.util.List;

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
