package com.nexawork.auth.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.auth.dtos.requests.AcceptInvitationRequest;
import com.nexawork.auth.dtos.responses.AuthResponse;
import com.nexawork.auth.dtos.responses.InvitationContextResponse;
import com.nexawork.auth.dtos.responses.InvitationResponse;
import com.nexawork.auth.services.InvitationService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Invitations par token (public, §3.2) + gestion admin (§13.1).
 */
@RestController
@RequestMapping("/api/v1/invitations")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class InvitationController {

    InvitationService invitationService;

    /**
     * Contexte public du bandeau d'invitation (§3.2) — endpoint ajouté au
     * contrat §13.1 (précision impl. Phase 2 documentée dans V5.1).
     */
    @GetMapping("/{token}")
    public Response<InvitationContextResponse> getContext(@PathVariable String token) {
        return Response.<InvitationContextResponse>ok().setPayload(invitationService.getContext(token));
    }

    @PostMapping("/{token}/accept")
    @ResponseStatus(HttpStatus.CREATED)
    public Response<AuthResponse> accept(@PathVariable String token,
                                         @Valid @RequestBody AcceptInvitationRequest request) {
        return Response.<AuthResponse>created().setPayload(invitationService.accept(token, request));
    }

    /**
     * Acceptation par un utilisateur déjà inscrit (§3.2) : authentifié, rejoint
     * le workspace sans re-saisir son profil.
     */
    @PostMapping("/{token}/join")
    public Response<AuthResponse> join(@PathVariable String token) {
        return Response.<AuthResponse>ok().setPayload(invitationService.join(token));
    }

    @PostMapping("/{invId}/resend")
    public Response<InvitationResponse> resend(@PathVariable UUID invId) {
        return Response.<InvitationResponse>ok().setPayload(invitationService.resend(invId));
    }

    @DeleteMapping("/{invId}")
    public Response<Void> cancel(@PathVariable UUID invId) {
        invitationService.cancel(invId);
        return Response.deleted();
    }
}
