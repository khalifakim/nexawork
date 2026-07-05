package com.nexawork.messaging.services.impl;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.messaging.dtos.requests.CreateConversationRequest;
import com.nexawork.messaging.dtos.requests.SendMessageRequest;
import com.nexawork.messaging.dtos.responses.ConversationResponse;
import com.nexawork.messaging.dtos.responses.MessagePageResponse;
import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.entities.Conversation;
import com.nexawork.messaging.entities.ConversationParticipant;
import com.nexawork.messaging.entities.Message;
import com.nexawork.messaging.entities.enums.MessageType;
import com.nexawork.messaging.repositories.ConversationParticipantRepository;
import com.nexawork.messaging.repositories.ConversationRepository;
import com.nexawork.messaging.repositories.MessageRepository;
import com.nexawork.messaging.security.CallerContext;
import com.nexawork.messaging.services.ConversationService;
import com.nexawork.messaging.services.MessageAssembler;
import com.nexawork.messaging.services.MessageBroadcaster;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Conversations directes (§13.5). Unicité DIRECT entre deux utilisateurs d'un
 * workspace ; accusé de lecture ({@code readAt} ✓✓) sur les messages reçus.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ConversationServiceImpl implements ConversationService {

    ConversationRepository conversationRepository;
    ConversationParticipantRepository participantRepository;
    MessageRepository messageRepository;
    MessageAssembler assembler;
    MessageBroadcaster broadcaster;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> listMine() {
        return conversationRepository.findMineInWorkspace(caller.organisationId(), caller.userId())
                .stream().map(this::toDto).toList();
    }

    @Override
    public ConversationResponse openWith(CreateConversationRequest request) {
        UUID me = caller.userId();
        UUID other = request.getUserId();
        if (other.equals(me)) {
            throw new InvalidRequestException("Impossible d'ouvrir une conversation avec soi-même.");
        }
        UUID workspaceId = caller.organisationId();

        // Unicité : réutilise la conversation DIRECT existante si elle existe (§4.5).
        Conversation conversation = conversationRepository
                .findDirectBetween(workspaceId, me, other)
                .orElseGet(() -> createDirect(workspaceId, me, other));
        return toDto(conversation);
    }

    @Override
    @Transactional(readOnly = true)
    public MessagePageResponse listMessages(UUID conversationId, String cursor, int size) {
        requireParticipant(conversationId);
        LocalDateTime before = parseCursor(cursor);
        int pageSize = normalizeSize(size);
        PageRequest limit = PageRequest.of(0, pageSize + 1);
        List<Message> page = before == null
                ? messageRepository.findConversationFirstPage(conversationId, limit)
                : messageRepository.findConversationBefore(conversationId, before, limit);
        boolean hasMore = page.size() > pageSize;
        List<Message> content = hasMore ? page.subList(0, pageSize) : page;
        List<MessageResponse> dtos = content.stream().map(assembler::toDto).toList();
        String nextCursor = content.isEmpty() ? null : content.get(content.size() - 1).getSentAt().toString();
        return MessagePageResponse.builder()
                .messages(dtos).nextCursor(hasMore ? nextCursor : null).hasMore(hasMore).build();
    }

    @Override
    public MessageResponse sendMessage(UUID conversationId, SendMessageRequest request) {
        requireParticipant(conversationId);
        Message message = messageRepository.save(Message.builder()
                .channel(null)
                .conversationId(conversationId)
                .senderUserId(caller.userId())
                .content(request.getContent())
                .attachmentUrl(request.getAttachmentUrl())
                .attachmentName(request.getAttachmentName())
                .messageType(MessageType.USER)
                .isDeleted(false)
                .edited(false)
                .build());
        assembler.persistMentions(message);
        MessageResponse dto = assembler.toDto(message);
        broadcaster.broadcastConversationMessage(conversationId, dto); // temps réel (§7.5)
        return dto;
    }

    @Override
    public MessageResponse markRead(UUID messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message introuvable."));
        if (message.getConversationId() == null) {
            throw new InvalidRequestException("L'accusé de lecture ne s'applique qu'aux conversations directes.");
        }
        requireParticipant(message.getConversationId());
        // 403 si l'appelant est l'expéditeur (on ne marque « lu » que les messages reçus).
        if (message.getSenderUserId().equals(caller.userId())) {
            throw new ForbiddenException("Seul le destinataire peut marquer un message comme lu.");
        }
        if (message.getReadAt() == null) {
            message.setReadAt(Instant.now());
            messageRepository.save(message);
        }
        return assembler.toDto(message);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private Conversation createDirect(UUID workspaceId, UUID me, UUID other) {
        Conversation conversation = conversationRepository.save(Conversation.builder()
                .workspaceId(workspaceId)
                .type("DIRECT")
                .build());
        participantRepository.save(ConversationParticipant.builder()
                .conversation(conversation).userId(me).isRead(true).build());
        participantRepository.save(ConversationParticipant.builder()
                .conversation(conversation).userId(other).isRead(false).build());
        return conversation;
    }

    private void requireParticipant(UUID conversationId) {
        if (!participantRepository.existsByConversationIdAndUserId(conversationId, caller.userId())) {
            // 404 pour ne pas révéler l'existence d'une conversation dont on n'est pas membre.
            throw new ResourceNotFoundException("Conversation introuvable.");
        }
    }

    private ConversationResponse toDto(Conversation c) {
        List<UUID> participants = participantRepository.findByConversationId(c.getId())
                .stream().map(ConversationParticipant::getUserId).toList();
        boolean isRead = participantRepository.findByConversationId(c.getId()).stream()
                .filter(p -> p.getUserId().equals(caller.userId()))
                .findFirst().map(ConversationParticipant::getIsRead).orElse(true);
        return ConversationResponse.builder()
                .id(c.getId()).workspaceId(c.getWorkspaceId()).type(c.getType())
                .participantUserIds(participants).isRead(isRead).createdAt(c.getCreatedAt()).build();
    }

    private LocalDateTime parseCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) return null;
        try {
            return LocalDateTime.parse(cursor);
        } catch (Exception e) {
            return null;
        }
    }

    private int normalizeSize(int size) {
        if (size <= 0) return 30;
        return Math.min(size, 100);
    }
}
