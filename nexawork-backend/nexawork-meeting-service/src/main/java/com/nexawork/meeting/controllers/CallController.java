package com.nexawork.meeting.controllers;

import com.nexawork.meeting.dtos.requests.CreateCallRequest;
import com.nexawork.meeting.dtos.requests.InviteGuestRequest;
import com.nexawork.meeting.dtos.responses.CallResponse;
import com.nexawork.meeting.security.SecurityUtils;
import com.nexawork.meeting.services.CallService;
import com.nexawork.meeting.utils.Response;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Meetings")
@RestController
@RequestMapping("/api/v1/meetings")
@RequiredArgsConstructor
public class CallController {

    private final CallService callService;

    @Operation(summary = "Créer un appel")
    @PostMapping
    public ResponseEntity<Response<CallResponse>> createCall(@Valid @RequestBody CreateCallRequest request) {
        Long orgId       = SecurityUtils.getCurrentOrganisationId().orElseThrow(() -> new RuntimeException("Organisation manquante"));
        Long userId      = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        String email     = SecurityUtils.getCurrentUserEmail().orElse("");
        String name      = SecurityUtils.getCurrentDisplayName().orElse("Utilisateur");
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Response.created(callService.createCall(request, orgId, userId, email, name), "Appel créé"));
    }

    @Operation(summary = "Rejoindre un appel")
    @PostMapping("/{callId}/join")
    public ResponseEntity<Response<CallResponse>> joinCall(@PathVariable Long callId) {
        Long userId  = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        String email = SecurityUtils.getCurrentUserEmail().orElse("");
        String name  = SecurityUtils.getCurrentDisplayName().orElse("Utilisateur");
        return ResponseEntity.ok(Response.ok(callService.joinCall(callId, userId, email, name), "Appel rejoint"));
    }

    @Operation(summary = "Terminer un appel")
    @PostMapping("/{callId}/end")
    public ResponseEntity<Response<Void>> endCall(@PathVariable Long callId) {
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        callService.endCall(callId, userId);
        return ResponseEntity.ok(Response.ok(null, "Appel terminé"));
    }

    @Operation(summary = "Inviter un invité externe")
    @PostMapping("/{callId}/guests")
    public ResponseEntity<Response<Void>> inviteGuest(
            @PathVariable Long callId,
            @Valid @RequestBody InviteGuestRequest request) {
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        callService.inviteGuest(callId, request, userId);
        return ResponseEntity.ok(Response.ok(null, "Invité notifié"));
    }

    @Operation(summary = "Lister les appels de l'organisation")
    @GetMapping
    public ResponseEntity<Response<List<CallResponse>>> list() {
        Long orgId = SecurityUtils.getCurrentOrganisationId().orElseThrow(() -> new RuntimeException("Organisation manquante"));
        return ResponseEntity.ok(Response.ok(callService.findByOrganisation(orgId), "Appels récupérés"));
    }
}
