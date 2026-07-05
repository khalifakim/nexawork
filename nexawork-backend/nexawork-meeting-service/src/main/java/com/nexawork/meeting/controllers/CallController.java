package com.nexawork.meeting.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.meeting.dtos.requests.CreateCallRequest;
import com.nexawork.meeting.dtos.requests.InviteGuestRequest;
import com.nexawork.meeting.dtos.responses.CallResponse;
import com.nexawork.meeting.dtos.responses.GuestInviteResponse;
import com.nexawork.meeting.services.CallService;
import com.nexawork.meeting.services.GuestService;
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

import java.util.List;
import java.util.UUID;

/**
 * Appels vidéo (§13.6). REF A (unicité → 409) sur create/join. Le token JaaS
 * (RS256) est renvoyé dans {@code jitsiUrl}/{@code jwt} à la création et au join.
 */
@RestController
@RequestMapping("/api/v1/calls")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CallController {

    CallService callService;
    GuestService guestService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<CallResponse> create(@Valid @RequestBody CreateCallRequest request) {
        return Response.<CallResponse>created().setPayload(callService.create(request));
    }

    @GetMapping
    public Response<List<CallResponse>> history() {
        return Response.<List<CallResponse>>ok().setPayload(callService.history());
    }

    /** Appel en cours de l'appelant (source de vérité du popover « Appel en cours »). */
    @GetMapping("/ongoing")
    public Response<CallResponse> ongoing() {
        return Response.<CallResponse>ok().setPayload(callService.ongoing());
    }

    @GetMapping("/{id}")
    public Response<CallResponse> get(@PathVariable UUID id) {
        return Response.<CallResponse>ok().setPayload(callService.get(id));
    }

    @PostMapping("/{id}/join")
    public Response<CallResponse> join(@PathVariable UUID id) {
        return Response.<CallResponse>ok().setPayload(callService.join(id));
    }

    @PostMapping("/{id}/leave")
    public Response<Void> leave(@PathVariable UUID id) {
        callService.leave(id);
        return Response.ok();
    }

    @PostMapping("/{id}/end")
    public Response<Void> end(@PathVariable UUID id) {
        callService.end(id);
        return Response.ok();
    }

    /** Invite un participant externe (email) → lien à usage unique + external.guest.invited. */
    @PostMapping("/{id}/guests")
    @ResponseStatus(HttpStatus.CREATED)
    public Response<GuestInviteResponse> invite(@PathVariable UUID id,
                                                @Valid @RequestBody InviteGuestRequest request) {
        return Response.<GuestInviteResponse>created().setPayload(guestService.invite(id, request));
    }

    /** Masque l'appel de l'historique personnel de l'appelant. */
    @PostMapping("/{id}/hide")
    public Response<Void> hide(@PathVariable UUID id) {
        callService.hide(id);
        return Response.ok();
    }

    /** Supprime définitivement l'appel (REF B : ADMIN/OWNER seul → 403 sinon). */
    @DeleteMapping("/{id}")
    public Response<Void> delete(@PathVariable UUID id) {
        callService.delete(id);
        return Response.ok();
    }
}
