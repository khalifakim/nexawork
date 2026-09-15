package com.nexawork.messaging.services.impl;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.messaging.dtos.responses.MentionResponse;
import com.nexawork.messaging.entities.Conversation;
import com.nexawork.messaging.entities.Message;
import com.nexawork.messaging.entities.MessageMention;
import com.nexawork.messaging.entities.enums.MentionType;
import com.nexawork.messaging.mappers.MessageMapper;
import com.nexawork.messaging.repositories.ConversationRepository;
import com.nexawork.messaging.repositories.MessageMentionRepository;
import com.nexawork.messaging.security.CallerContext;
import com.nexawork.messaging.services.MentionService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    ConversationRepository conversationRepository;
    MessageMapper messageMapper;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<MentionResponse> listReceived(boolean onlyUnread) {
        final UUID org = caller.organisationId();
        // Cache local des orgs de conversation (évite un N+1 sur les DM).
        final Map<UUID, UUID> convOrg = new HashMap<>();
        return mentionRepository.findByTargetIdAndMentionType(caller.userId(), MentionType.USER).stream()
                // Une auto-mention (je me cite dans mon propre message) ne doit jamais
                // apparaître dans « Mentions reçues » (ni générer de notification, déjà exclu).
                .filter(m -> m.getMessage() == null
                        || !caller.userId().equals(m.getMessage().getSenderUserId()))
                // Isolation par workspace : ne garder que les mentions dont le message
                // appartient à l'organisation active (canal OU conversation).
                .filter(m -> org != null && org.equals(orgOf(m.getMessage(), convOrg)))
                .filter(m -> !onlyUnread || Boolean.FALSE.equals(m.getIsRead()))
                .map(messageMapper::asMentionDto)
                .toList();
    }

    /** Organisation d'un message : celle de son canal, ou de sa conversation. */
    private UUID orgOf(Message msg, Map<UUID, UUID> convOrg) {
        if (msg == null) return null;
        if (msg.getChannel() != null) return msg.getChannel().getOrganisationId();
        UUID convId = msg.getConversationId();
        if (convId == null) return null;
        return convOrg.computeIfAbsent(convId, id -> conversationRepository.findById(id)
                .map(Conversation::getWorkspaceId).orElse(null));
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
        final UUID org = caller.organisationId();
        final Map<UUID, UUID> convOrg = new HashMap<>();
        List<MessageMention> mine = mentionRepository
                .findByTargetIdAndMentionType(caller.userId(), MentionType.USER).stream()
                // Ne marquer lues que les mentions de l'espace de travail actif.
                .filter(m -> org != null && org.equals(orgOf(m.getMessage(), convOrg)))
                .toList();
        mine.forEach(m -> m.setIsRead(true));
        mentionRepository.saveAll(mine);
    }
}
