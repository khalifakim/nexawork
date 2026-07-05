package com.nexawork.messaging.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.messaging.dtos.requests.SendMessageRequest;
import com.nexawork.messaging.dtos.responses.MessagePageResponse;
import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.services.MessageService;
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

import java.util.UUID;

/**
 * Messages d'un canal (§13.5). Historique paginé (curseur) + envoi (REST ou STOMP,
 * Lot 7C). REF F (accès), REF D (écriture readonly).
 */
@RestController
@RequestMapping("/api/v1/channels/{channelId}/messages")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChannelMessageController {

    MessageService messageService;

    @GetMapping
    public Response<MessagePageResponse> list(@PathVariable UUID channelId,
                                              @RequestParam(required = false) String cursor,
                                              @RequestParam(defaultValue = "30") int size) {
        return Response.<MessagePageResponse>ok().setPayload(messageService.listChannelMessages(channelId, cursor, size));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<MessageResponse> send(@PathVariable UUID channelId,
                                          @Valid @RequestBody SendMessageRequest request) {
        return Response.<MessageResponse>created().setPayload(messageService.sendChannelMessage(channelId, request));
    }
}
