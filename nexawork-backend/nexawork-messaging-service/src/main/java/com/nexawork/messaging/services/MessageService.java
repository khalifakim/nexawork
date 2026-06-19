package com.nexawork.messaging.services;

import com.nexawork.messaging.dtos.requests.SendMessageRequest;
import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.entities.Channel;
import com.nexawork.messaging.entities.Message;
import com.nexawork.messaging.entities.MessageMention;
import com.nexawork.messaging.entities.enums.MentionType;
import com.nexawork.messaging.exceptions.ResourceNotFoundException;
import com.nexawork.messaging.repositories.ChannelRepository;
import com.nexawork.messaging.repositories.MessageMentionRepository;
import com.nexawork.messaging.repositories.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepo;
    private final ChannelRepository channelRepo;
    private final MessageMentionRepository mentionRepo;
    private final SimpMessagingTemplate messagingTemplate;

    // Ordre important : @@@... avant @@... avant @...
    private static final Pattern DOCUMENT_PATTERN = Pattern.compile("@@@(\\w+)");
    private static final Pattern TASK_PATTERN     = Pattern.compile("(?<!@)@@(?!@)(\\w+)");
    private static final Pattern USER_PATTERN     = Pattern.compile("(?<!@)@(?!@)(\\w+)");
    private static final Pattern CHANNEL_PATTERN  = Pattern.compile("#(\\w+)");

    @Transactional
    public MessageResponse send(Long channelId, SendMessageRequest request, Long senderUserId) {
        Channel channel = channelRepo.findById(channelId)
            .orElseThrow(() -> new ResourceNotFoundException("Canal introuvable : " + channelId));

        Message message = Message.builder()
            .channel(channel)
            .senderUserId(senderUserId)
            .content(request.content())
            .attachmentUrl(request.attachmentUrl())
            .attachmentName(request.attachmentName())
            .build();
        messageRepo.save(message);

        List<MessageMention> mentions = extractMentions(message, request.content());
        if (!mentions.isEmpty()) {
            mentionRepo.saveAll(mentions);
            message.getMentions().addAll(mentions);
        }

        MessageResponse response = toResponse(message);
        messagingTemplate.convertAndSend("/topic/channels/" + channelId, response);
        return response;
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getHistory(Long channelId, int page, int size) {
        return messageRepo.findByChannelIdOrderBySentAtDesc(
                channelId, PageRequest.of(page, size)).stream()
            .map(this::toResponse).collect(Collectors.toList());
    }

    private List<MessageMention> extractMentions(Message message, String content) {
        List<MessageMention> mentions = new ArrayList<>();

        // @@@xxx → DOCUMENT (doit être traité en premier)
        Matcher docMatcher = DOCUMENT_PATTERN.matcher(content);
        while (docMatcher.find()) {
            mentions.add(MessageMention.builder()
                .message(message).mentionType(MentionType.DOCUMENT)
                .targetText(docMatcher.group(1)).build());
        }

        // @@xxx → TASK (après avoir enlevé les @@@)
        String withoutDoc = DOCUMENT_PATTERN.matcher(content).replaceAll("");
        Matcher taskMatcher = TASK_PATTERN.matcher(withoutDoc);
        while (taskMatcher.find()) {
            mentions.add(MessageMention.builder()
                .message(message).mentionType(MentionType.TASK)
                .targetText(taskMatcher.group(1)).build());
        }

        // @xxx → USER (après avoir enlevé les @@@ et @@)
        String withoutTask = TASK_PATTERN.matcher(withoutDoc).replaceAll("");
        Matcher userMatcher = USER_PATTERN.matcher(withoutTask);
        while (userMatcher.find()) {
            mentions.add(MessageMention.builder()
                .message(message).mentionType(MentionType.USER)
                .targetText(userMatcher.group(1)).build());
        }

        // #xxx → CHANNEL
        Matcher channelMatcher = CHANNEL_PATTERN.matcher(content);
        while (channelMatcher.find()) {
            mentions.add(MessageMention.builder()
                .message(message).mentionType(MentionType.CHANNEL)
                .targetText(channelMatcher.group(1)).build());
        }

        return mentions;
    }

    private MessageResponse toResponse(Message m) {
        Long channelId = m.getChannel() != null ? m.getChannel().getId() : null;
        return new MessageResponse(m.getId(), channelId, m.getConversationId(),
            m.getSenderUserId(), m.getContent(),
            m.getAttachmentUrl(), m.getAttachmentName(),
            m.getMessageType(), m.getSentAt(), m.getEdited());
    }
}
