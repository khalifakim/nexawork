package com.nexawork.messaging.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.messaging.dtos.requests.CreateConversationRequest;
import com.nexawork.messaging.dtos.requests.SendMessageRequest;
import com.nexawork.messaging.dtos.responses.ConversationResponse;
import com.nexawork.messaging.dtos.responses.MessagePageResponse;
import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.services.ConversationService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Conversations directes (§13.5). Unicité DIRECT + messages + accusé de lecture.
 */
@RestController
@RequestMapping("/api/v1/conversations")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ConversationController {

    ConversationService conversationService;

    @GetMapping
    public Response<List<ConversationResponse>> list() {
        return Response.<List<ConversationResponse>>ok().setPayload(conversationService.listMine());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<ConversationResponse> open(@Valid @RequestBody CreateConversationRequest request) {
        return Response.<ConversationResponse>created().setPayload(conversationService.openWith(request));
    }

    @GetMapping("/{id}/messages")
    public Response<MessagePageResponse> listMessages(@PathVariable UUID id,
                                                      @RequestParam(required = false) String cursor,
                                                      @RequestParam(defaultValue = "30") int size) {
        return Response.<MessagePageResponse>ok().setPayload(conversationService.listMessages(id, cursor, size));
    }

    @PostMapping("/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public Response<MessageResponse> send(@PathVariable UUID id,
                                          @Valid @RequestBody SendMessageRequest request) {
        return Response.<MessageResponse>created().setPayload(conversationService.sendMessage(id, request));
    }
}
