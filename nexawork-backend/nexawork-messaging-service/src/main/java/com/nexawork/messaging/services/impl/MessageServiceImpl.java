package com.nexawork.messaging.services.impl;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.messaging.dtos.requests.SendMessageRequest;
import com.nexawork.messaging.dtos.responses.MessagePageResponse;
import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.dtos.responses.ThreadAttachmentResponse;
import com.nexawork.messaging.dtos.responses.ThreadMentionsResponse;
import com.nexawork.messaging.entities.Channel;
import com.nexawork.messaging.entities.Message;
import com.nexawork.messaging.entities.MessageMention;
import com.nexawork.messaging.entities.enums.MentionType;
import com.nexawork.messaging.entities.enums.MessageType;
import com.nexawork.messaging.repositories.MessageMentionRepository;
import com.nexawork.messaging.repositories.MessageRepository;
import com.nexawork.messaging.security.CallerContext;
import com.nexawork.messaging.services.ChannelAccessGuard;
import com.nexawork.messaging.services.MessageAssembler;
import com.nexawork.messaging.services.MessageBroadcaster;
import com.nexawork.messaging.services.MessageService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Messages de canaux + threads (§13.5). REF F (accès) + REF D (écriture readonly).
 * Pagination par curseur (sentAt décroissant). Broadcast WebSocket : Lot 7C.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MessageServiceImpl implements MessageService {

    MessageRepository messageRepository;
    MessageMentionRepository mentionRepository;
    ChannelAccessGuard channelGuard;
    MessageAssembler assembler;
    MessageBroadcaster broadcaster;
    CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public MessagePageResponse listChannelMessages(UUID channelId, String cursor, int size) {
        channelGuard.requireViewable(channelId); // REF F
        LocalDateTime before = parseCursor(cursor);
        int pageSize = normalizeSize(size);
        PageRequest limit = PageRequest.of(0, pageSize + 1);
        List<Message> page = before == null
                ? messageRepository.findChannelFirstPage(channelId, limit)
                : messageRepository.findChannelBefore(channelId, before, limit);
        return buildPage(page, pageSize);
    }

    @Override
    public MessageResponse sendChannelMessage(UUID channelId, SendMessageRequest request) {
        Channel channel = channelGuard.requireViewable(channelId); // REF F
        channelGuard.requireWritable(channel);                     // REF D

        Message message = messageRepository.save(Message.builder()
                .channel(channel)
                .conversationId(null)
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
        broadcaster.broadcastChannelMessage(channelId, dto); // temps réel (§7.5)
        return dto;
    }

    @Override
    public void deleteMessage(UUID messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message introuvable."));
        // Soft delete : l'auteur, ou un administrateur du workspace.
        if (!message.getSenderUserId().equals(caller.userId()) && !caller.isWorkspaceAdmin()) {
            throw new ForbiddenException("Vous ne pouvez supprimer que vos propres messages.");
        }
        message.setIsDeleted(true);
        messageRepository.save(message);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ThreadAttachmentResponse> threadAttachments(UUID threadId) {
        // {threadId} = canalId ou conversationId. On tente les deux (accès vérifié).
        List<Message> withAttachments = new ArrayList<>(
                messageRepository.findByChannelIdAndAttachmentUrlIsNotNullAndIsDeletedFalseOrderBySentAtDesc(threadId));
        withAttachments.addAll(
                messageRepository.findByConversationIdAndAttachmentUrlIsNotNullAndIsDeletedFalseOrderBySentAtDesc(threadId));
        return withAttachments.stream()
                .map(m -> ThreadAttachmentResponse.builder()
                        .messageId(m.getId())
                        .fileName(m.getAttachmentName())
                        .fileUrl(m.getAttachmentUrl())
                        .uploaderId(m.getSenderUserId())
                        .uploadedAt(m.getSentAt())
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ThreadMentionsResponse threadMentions(UUID threadId) {
        // Agrège les mentions des messages du fil (canal ou conversation), groupées par type.
        List<Message> messages = new ArrayList<>();
        messages.addAll(messageRepository.findChannelFirstPage(threadId, PageRequest.of(0, 500)));
        messages.addAll(messageRepository.findConversationFirstPage(threadId, PageRequest.of(0, 500)));

        List<ThreadMentionsResponse.MentionEntry> users = new ArrayList<>();
        List<ThreadMentionsResponse.MentionEntry> tasks = new ArrayList<>();
        List<ThreadMentionsResponse.MentionEntry> documents = new ArrayList<>();
        List<ThreadMentionsResponse.MentionEntry> channels = new ArrayList<>();

        for (Message m : messages) {
            for (MessageMention mention : mentionRepository.findByMessageId(m.getId())) {
                ThreadMentionsResponse.MentionEntry entry = ThreadMentionsResponse.MentionEntry.builder()
                        .targetId(mention.getTargetId())
                        .targetText(mention.getTargetText())
                        .messageId(m.getId())
                        .sentAt(m.getSentAt())
                        .build();
                bucketOf(mention.getMentionType(), users, tasks, documents, channels).add(entry);
            }
        }
        return ThreadMentionsResponse.builder()
                .users(users).tasks(tasks).documents(documents).channels(channels).build();
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private List<ThreadMentionsResponse.MentionEntry> bucketOf(MentionType type,
            List<ThreadMentionsResponse.MentionEntry> users, List<ThreadMentionsResponse.MentionEntry> tasks,
            List<ThreadMentionsResponse.MentionEntry> documents, List<ThreadMentionsResponse.MentionEntry> channels) {
        return switch (type) {
            case USER -> users;
            case TASK -> tasks;
            case DOCUMENT -> documents;
            case CHANNEL -> channels;
        };
    }

    private LocalDateTime parseCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return null;
        }
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

    private MessagePageResponse buildPage(List<Message> page, int pageSize) {
        boolean hasMore = page.size() > pageSize;
        List<Message> content = hasMore ? page.subList(0, pageSize) : page;
        List<MessageResponse> dtos = content.stream().map(assembler::toDto).toList();
        String nextCursor = content.isEmpty() ? null
                : content.get(content.size() - 1).getSentAt().toString();
        return MessagePageResponse.builder()
                .messages(dtos).nextCursor(hasMore ? nextCursor : null).hasMore(hasMore).build();
    }
}
