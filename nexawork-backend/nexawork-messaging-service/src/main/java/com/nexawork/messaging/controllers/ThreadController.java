package com.nexawork.messaging.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.messaging.dtos.responses.ThreadAttachmentResponse;
import com.nexawork.messaging.dtos.responses.ThreadMentionsResponse;
import com.nexawork.messaging.services.MessageService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Panneaux transverses d'un fil (§13.5, §12.4) : « Fichiers joints » et
 * « Éléments mentionnés ». {@code threadId} accepte un canalId ou un conversationId.
 */
@RestController
@RequestMapping("/api/v1/threads/{threadId}")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ThreadController {

    MessageService messageService;

    @GetMapping("/attachments")
    public Response<List<ThreadAttachmentResponse>> attachments(@PathVariable UUID threadId) {
        return Response.<List<ThreadAttachmentResponse>>ok().setPayload(messageService.threadAttachments(threadId));
    }

    @GetMapping("/mentions")
    public Response<ThreadMentionsResponse> mentions(@PathVariable UUID threadId) {
        return Response.<ThreadMentionsResponse>ok().setPayload(messageService.threadMentions(threadId));
    }
}
