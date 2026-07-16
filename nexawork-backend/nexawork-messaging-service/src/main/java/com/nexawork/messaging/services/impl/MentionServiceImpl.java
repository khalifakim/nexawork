package com.nexawork.messaging.services.impl;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.messaging.dtos.responses.MentionResponse;
import com.nexawork.messaging.entities.MessageMention;
import com.nexawork.messaging.entities.enums.MentionType;
import com.nexawork.messaging.mappers.MessageMapper;
import com.nexawork.messaging.repositories.MessageMentionRepository;
import com.nexawork.messaging.security.CallerContext;
import com.nexawork.messaging.services.MentionService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Vue « Mentions reçues » (§13.5, §5.3). Mentions USER dont {@code targetId} =
 * utilisateur courant.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MentionServiceImpl implements MentionService {

    MessageMentionRepository mentionRepository;
    MessageMapper messageMapper;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<MentionResponse> listReceived(boolean onlyUnread) {
        return mentionRepository.findByTargetIdAndMentionType(caller.userId(), MentionType.USER).stream()
                // Une auto-mention (je me cite dans mon propre message) ne doit jamais
                // apparaître dans « Mentions reçues » (ni générer de notification, déjà exclu).
                .filter(m -> m.getMessage() == null
                        || !caller.userId().equals(m.getMessage().getSenderUserId()))
                .filter(m -> !onlyUnread || Boolean.FALSE.equals(m.getIsRead()))
                .map(messageMapper::asMentionDto)
                .toList();
    }

    @Override
    public void markRead(UUID mentionId) {
        MessageMention mention = mentionRepository.findById(mentionId)
                .orElseThrow(() -> new ResourceNotFoundException("Mention introuvable."));
        if (mention.getTargetId() == null || !mention.getTargetId().equals(caller.userId())) {
            throw new ForbiddenException("Cette mention ne vous est pas adressée.");
        }
        mention.setIsRead(true);
        mentionRepository.save(mention);
    }

    @Override
    public void markAllRead() {
        List<MessageMention> mine = mentionRepository
                .findByTargetIdAndMentionType(caller.userId(), MentionType.USER);
        mine.forEach(m -> m.setIsRead(true));
        mentionRepository.saveAll(mine);
    }
}
