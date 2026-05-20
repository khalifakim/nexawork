package com.nexawork.messaging.services;

import com.nexawork.messaging.dtos.requests.SendMessageRequest;
import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.entities.Channel;
import com.nexawork.messaging.entities.Message;
import com.nexawork.messaging.exceptions.ResourceNotFoundException;
import com.nexawork.messaging.repositories.ChannelRepository;
import com.nexawork.messaging.repositories.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepo;
    private final ChannelRepository channelRepo;
    private final SimpMessagingTemplate messagingTemplate;

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

    private MessageResponse toResponse(Message m) {
        return new MessageResponse(m.getId(), m.getChannel().getId(),
            m.getSenderUserId(), m.getContent(),
            m.getAttachmentUrl(), m.getAttachmentName(),
            m.getSentAt(), m.getEdited());
    }
}
