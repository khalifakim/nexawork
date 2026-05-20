package com.nexawork.messaging.websocket;

import com.nexawork.messaging.dtos.requests.SendMessageRequest;
import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.services.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class MessagingWebSocketController {

    private final MessageService messageService;

    @MessageMapping("/channels/{channelId}/send")
    public void sendMessage(
            @DestinationVariable Long channelId,
            @Payload SendMessageRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        String userIdStr = (String) headerAccessor.getSessionAttributes().get("userId");
        Long userId = userIdStr != null ? Long.parseLong(userIdStr) : null;
        if (userId == null) return;
        messageService.send(channelId, request, userId);
    }
}
