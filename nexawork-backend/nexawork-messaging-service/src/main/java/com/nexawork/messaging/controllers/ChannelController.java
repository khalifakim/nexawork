package com.nexawork.messaging.controllers;

import com.nexawork.messaging.dtos.requests.CreateChannelRequest;
import com.nexawork.messaging.dtos.requests.SendMessageRequest;
import com.nexawork.messaging.dtos.responses.ChannelResponse;
import com.nexawork.messaging.dtos.responses.MessageResponse;
import com.nexawork.messaging.security.SecurityUtils;
import com.nexawork.messaging.services.ChannelService;
import com.nexawork.messaging.services.MessageService;
import com.nexawork.messaging.utils.Response;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Messaging")
@RestController
@RequestMapping("/api/v1/messaging")
@RequiredArgsConstructor
public class ChannelController {

    private final ChannelService channelService;
    private final MessageService messageService;

    @Operation(summary = "Créer un canal")
    @PostMapping("/channels")
    public ResponseEntity<Response<ChannelResponse>> createChannel(@Valid @RequestBody CreateChannelRequest request) {
        Long orgId  = SecurityUtils.getCurrentOrganisationId().orElseThrow(() -> new RuntimeException("Organisation manquante"));
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Response.created(channelService.create(request, orgId, userId), "Canal créé"));
    }

    @Operation(summary = "Lister les canaux")
    @GetMapping("/channels")
    public ResponseEntity<Response<List<ChannelResponse>>> listChannels() {
        Long orgId = SecurityUtils.getCurrentOrganisationId().orElseThrow(() -> new RuntimeException("Organisation manquante"));
        return ResponseEntity.ok(Response.ok(channelService.findByOrganisation(orgId), "Canaux récupérés"));
    }

    @Operation(summary = "Rejoindre un canal")
    @PostMapping("/channels/{channelId}/join")
    public ResponseEntity<Response<Void>> joinChannel(@PathVariable Long channelId) {
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        channelService.join(channelId, userId);
        return ResponseEntity.ok(Response.ok(null, "Canal rejoint"));
    }

    @Operation(summary = "Envoyer un message (REST)")
    @PostMapping("/channels/{channelId}/messages")
    public ResponseEntity<Response<MessageResponse>> sendMessage(
            @PathVariable Long channelId,
            @Valid @RequestBody SendMessageRequest request) {
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Response.created(messageService.send(channelId, request, userId), "Message envoyé"));
    }

    @Operation(summary = "Historique des messages")
    @GetMapping("/channels/{channelId}/messages")
    public ResponseEntity<Response<List<MessageResponse>>> getHistory(
            @PathVariable Long channelId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(Response.ok(
            messageService.getHistory(channelId, page, size), "Messages récupérés"));
    }
}
