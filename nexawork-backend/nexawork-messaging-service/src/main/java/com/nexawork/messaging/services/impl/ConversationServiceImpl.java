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
        UUID me = caller.userId();
        return conversationRepository.findMineInWorkspace(caller.organisationId(), me).stream()
                // Une conversation que j'ai supprimée reste masquée tant qu'aucun message
                // n'arrive depuis ; elle réapparaît (post-suppression) au prochain message.
                .filter(c -> {
                    LocalDateTime cleared = clearedAtFor(c.getId(), me);
                    return cleared == null
                            || messageRepository.existsByConversationIdAndSentAtAfter(c.getId(), cleared);
                })
                .map(c -> toDto(c, me))
                .toList();
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
        // On NE réinitialise PAS mon clearedAt : rouvrir une conversation supprimée
        // n'y ramène pas l'ancien historique (il réapparaît côté de l'autre seulement).
        return toDto(conversation, me);
    }

    @Override
    @Transactional(readOnly = true)
    public MessagePageResponse listMessages(UUID conversationId, String cursor, int size) {
        requireParticipant(conversationId);
        // Ne renvoie que les messages postérieurs à MA suppression éventuelle.
        LocalDateTime since = sinceFor(conversationId, caller.userId());
        LocalDateTime before = parseCursor(cursor);
        int pageSize = normalizeSize(size);
        PageRequest limit = PageRequest.of(0, pageSize + 1);
        List<Message> page = before == null
                ? messageRepository.findConversationFirstPage(conversationId, since, limit)
                : messageRepository.findConversationBefore(conversationId, before, since, limit);
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
        assembler.requireSendable(request); // texte OU pièce(s) jointe(s)

        Message message = Message.builder()
                .channel(null)
                .conversationId(conversationId)
                .senderUserId(caller.userId())
                .content(request.getContent() != null ? request.getContent() : "")
                .messageType(MessageType.USER)
                .isDeleted(false)
                .edited(false)
                .replyToMessageId(request.getReplyToMessageId())
                .build();
        assembler.applyAttachments(message, request, caller.userId());
        // saveAndFlush : peuple `sentAt` (@CreationTimestamp) avant le DTO diffusé,
        // sinon l'heure part nulle en temps réel → « 00:00 » chez le destinataire.
        message = messageRepository.saveAndFlush(message);
        assembler.notifyMentioned(message, assembler.persistMentions(message, request), null, null, conversationId);
        MessageResponse dto = assembler.toDto(message);
        broadcaster.broadcastConversationMessage(conversationId, dto); // temps réel (§7.5)

        // Notification « nouveau message » (cloche) → l'autre participant.
        List<UUID> recipients = participantRepository.findByConversationId(conversationId).stream()
                .map(ConversationParticipant::getUserId)
                .filter(uid -> !uid.equals(caller.userId()))
                .toList();
        assembler.notifyNewMessage(message, recipients, null, null, conversationId);
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
            // Accusé de lecture TEMPS RÉEL : on rediffuse le message (désormais avec
            // `readAt`) sur le topic de la conversation. L'EXPÉDITEUR, abonné, voit
            // alors son message passer « lu » sans recharger. Sans cette diffusion,
            // le `readAt` n'était visible qu'au prochain rechargement de la page.
            broadcaster.broadcastConversationMessage(message.getConversationId(), assembler.toDto(message));
        }
        return assembler.toDto(message);
    }

    @Override
    public void deleteForMe(UUID conversationId) {
        ConversationParticipant me = participantRepository
                .findByConversationIdAndUserId(conversationId, caller.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation introuvable."));
        me.setClearedAt(LocalDateTime.now());
        participantRepository.save(me);

        // Suppression DÉFINITIVE (purge en base) seulement si TOUS les participants
        // ont supprimé la conversation de leur côté.
        boolean allCleared = participantRepository.findByConversationId(conversationId).stream()
                .allMatch(p -> p.getClearedAt() != null);
        if (allCleared) {
            messageRepository.deleteByConversationId(conversationId);
            participantRepository.deleteByConversationId(conversationId);
            conversationRepository.deleteById(conversationId);
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /** {@code cleared_at} de l'appelant pour cette conversation, ou {@code null}. */
    private LocalDateTime clearedAtFor(UUID conversationId, UUID userId) {
        return participantRepository.findByConversationIdAndUserId(conversationId, userId)
                .map(ConversationParticipant::getClearedAt).orElse(null);
    }

    /** Plancher utilisé quand l'appelant n'a jamais supprimé la conversation (tout l'historique). */
    private static final LocalDateTime SINCE_FLOOR = LocalDateTime.of(1970, 1, 1, 0, 0);

    /** Borne basse NON NULLE des messages visibles pour l'appelant (clearedAt, sinon plancher). */
    private LocalDateTime sinceFor(UUID conversationId, UUID userId) {
        LocalDateTime cleared = clearedAtFor(conversationId, userId);
        return cleared != null ? cleared : SINCE_FLOOR;
    }

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

    private ConversationResponse toDto(Conversation c, UUID me) {
        List<UUID> participants = participantRepository.findByConversationId(c.getId())
                .stream().map(ConversationParticipant::getUserId).toList();
        // Vrai compteur de non-lus (messages reçus sans `readAt`) : remplace le
        // booléen `is_read` du participant, jamais remis à jour après création →
        // le badge restait figé à « 1 ». `isRead` en découle (= aucun non-lu).
        // Borné à MA suppression éventuelle : les anciens messages ne comptent plus.
        long unread = messageRepository.countUnreadInConversation(c.getId(), me, sinceFor(c.getId(), me));
        return ConversationResponse.builder()
                .id(c.getId()).workspaceId(c.getWorkspaceId()).type(c.getType())
                .participantUserIds(participants)
                .unreadCount(unread)
                .isRead(unread == 0)
                .createdAt(c.getCreatedAt()).build();
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
