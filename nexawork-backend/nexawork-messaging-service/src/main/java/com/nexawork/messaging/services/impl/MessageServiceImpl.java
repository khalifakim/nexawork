package com.nexawork.messaging.services.impl;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.messaging.dtos.requests.SendMessageRequest;
import com.nexawork.messaging.dtos.responses.ChannelActivityEvent;
import com.nexawork.messaging.dtos.responses.MessagePageResponse;
import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.dtos.responses.ThreadAttachmentResponse;
import com.nexawork.messaging.dtos.responses.ThreadMentionsResponse;
import com.nexawork.messaging.entities.Channel;
import com.nexawork.messaging.entities.Message;
import com.nexawork.messaging.entities.MessageAttachment;
import com.nexawork.messaging.entities.MessageMention;
import com.nexawork.messaging.entities.enums.MentionType;
import com.nexawork.messaging.entities.enums.MessageType;
import com.nexawork.messaging.repositories.ChannelMemberRepository;
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
    ChannelMemberRepository channelMemberRepository;
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
        assembler.requireSendable(request);                        // texte OU pièce(s) jointe(s)

        Message message = Message.builder()
                .channel(channel)
                .conversationId(null)
                .senderUserId(caller.userId())
                .content(request.getContent() != null ? request.getContent() : "")
                .messageType(MessageType.USER)
                .isDeleted(false)
                .edited(false)
                .build();
        assembler.applyAttachments(message, request, caller.userId());
        // saveAndFlush : force l'INSERT immédiat pour que `@CreationTimestamp` peuple
        // `sentAt` AVANT de construire le DTO diffusé. Sans flush, `sentAt` restait
        // nul dans la trame temps réel → le destinataire affichait « 00:00 » jusqu'au
        // prochain rechargement (l'heure réelle n'étant en base qu'au commit).
        message = messageRepository.saveAndFlush(message);
        List<MessageMention> mentions = assembler.persistMentions(message, request);
        assembler.notifyMentioned(message, mentions, channel.getId(), channel.getName(), null);
        MessageResponse dto = assembler.toDto(message);
        broadcaster.broadcastChannelMessage(channelId, dto); // temps réel (§7.5)

        // Signale l'activité à ceux qui n'ont PAS le canal ouvert : sans cela, seul
        // un abonné du topic du canal apprend qu'un message est arrivé.
        broadcaster.broadcastChannelActivity(
                channel.getOrganisationId(),
                Boolean.TRUE.equals(channel.getIsPrivate()),
                channelMemberRepository.findByChannelId(channelId).stream()
                        .map(m -> m.getUserId()).toList(),
                ChannelActivityEvent.builder()
                        .messageId(message.getId())
                        .channelId(channel.getId())
                        .channelName(channel.getName())
                        .authorUserId(message.getSenderUserId())
                        .authorDisplayName(caller.displayName())
                        .excerpt(assembler.excerptOf(message.getContent()))
                        .build());

        // Notification « nouveau message » (cloche) : canaux PRIVÉS uniquement (leurs
        // membres explicites, hors auteur). Les canaux publics s'appuient sur le badge
        // « non lus » — pas de cloche pour éviter de notifier tout l'espace (décision §4).
        if (Boolean.TRUE.equals(channel.getIsPrivate())) {
            List<UUID> recipients = channelMemberRepository.findByChannelId(channelId).stream()
                    .map(m -> m.getUserId())
                    .filter(uid -> !uid.equals(caller.userId()))
                    .toList();
            assembler.notifyNewMessage(message, recipients, channel.getId(), channel.getName(), null);
        }
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
        // {threadId} = canalId ou conversationId. On agrège les messages des deux
        // fils possibles, puis leurs pièces jointes (V2) + l'éventuelle PJ héritée.
        List<Message> messages = new ArrayList<>();
        messages.addAll(messageRepository.findChannelFirstPage(threadId, PageRequest.of(0, 500)));
        messages.addAll(messageRepository.findConversationFirstPage(threadId, PageRequest.of(0, 500)));

        List<ThreadAttachmentResponse> out = new ArrayList<>();
        for (Message m : messages) {
            for (MessageAttachment a : m.getAttachments()) {
                out.add(ThreadAttachmentResponse.builder()
                        .messageId(m.getId())
                        .fileName(a.getFileName())
                        .fileUrl(a.getFileUrl())
                        .uploaderId(a.getUploaderUserId() != null ? a.getUploaderUserId() : m.getSenderUserId())
                        .uploadedAt(a.getUploadedAt() != null ? a.getUploadedAt() : m.getSentAt())
                        .build());
            }
            if (m.getAttachmentUrl() != null && !m.getAttachmentUrl().isBlank()) { // héritée
                out.add(ThreadAttachmentResponse.builder()
                        .messageId(m.getId())
                        .fileName(m.getAttachmentName())
                        .fileUrl(m.getAttachmentUrl())
                        .uploaderId(m.getSenderUserId())
                        .uploadedAt(m.getSentAt())
                        .build());
            }
        }
        return out;
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
