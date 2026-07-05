package com.nexawork.messaging.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.services.ConversationService;
import com.nexawork.messaging.services.MessageService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Actions sur un message par id (§13.5) : accusé de lecture (conversations
 * directes, indicateur ✓✓) et suppression (soft, auteur ou admin).
 */
@RestController
@RequestMapping("/api/v1/messages")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MessageController {

    ConversationService conversationService;
    MessageService messageService;

    @PatchMapping("/{id}/read")
    public Response<MessageResponse> markRead(@PathVariable UUID id) {
        return Response.<MessageResponse>ok().setPayload(conversationService.markRead(id));
    }

    @DeleteMapping("/{id}")
    public Response<Void> delete(@PathVariable UUID id) {
        messageService.deleteMessage(id);
        return Response.deleted();
    }
}
