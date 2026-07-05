package com.nexawork.messaging.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.messaging.dtos.responses.MentionResponse;
import com.nexawork.messaging.services.MentionService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Vue « Mentions reçues » (§13.5, §5.3) : mentions de l'utilisateur courant,
 * marquage lu individuel / global.
 */
@RestController
@RequestMapping("/api/v1/mentions")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MentionController {

    MentionService mentionService;

    @GetMapping
    public Response<List<MentionResponse>> list(@RequestParam(defaultValue = "false") boolean unread) {
        return Response.<List<MentionResponse>>ok().setPayload(mentionService.listReceived(unread));
    }

    @PatchMapping("/{id}/read")
    public Response<Void> markRead(@PathVariable UUID id) {
        mentionService.markRead(id);
        return Response.ok();
    }

    @PostMapping("/mark-all-read")
    public Response<Void> markAllRead() {
        mentionService.markAllRead();
        return Response.ok();
    }
}
