package com.nexawork.meeting.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.meeting.dtos.requests.CreateCallRequest;
import com.nexawork.meeting.dtos.requests.CreateMeetingMessageRequest;
import com.nexawork.meeting.dtos.requests.InviteGuestRequest;
import com.nexawork.meeting.dtos.requests.InviteParticipantsRequest;
import com.nexawork.meeting.dtos.requests.ShareMeetingFileRequest;
import com.nexawork.meeting.dtos.responses.MeetingFileResponse;
import com.nexawork.meeting.dtos.responses.CallResponse;
import com.nexawork.meeting.dtos.responses.GuestInviteResponse;
import com.nexawork.meeting.dtos.responses.JaasDiagnosticResponse;
import com.nexawork.meeting.dtos.responses.MeetingMessageResponse;
import com.nexawork.meeting.services.CallService;
import com.nexawork.meeting.services.GuestService;
import com.nexawork.meeting.services.MeetingChatService;
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
    MeetingChatService meetingChatService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<CallResponse> create(@Valid @RequestBody CreateCallRequest request) {
        return Response.<CallResponse>created().setPayload(callService.create(request));
    }

    /** Chat de réunion (M2) — ingestion d'un message capté côté client. */
    @PostMapping("/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public Response<MeetingMessageResponse> addMessage(@PathVariable UUID id,
                                                       @Valid @RequestBody CreateMeetingMessageRequest request) {
        return Response.<MeetingMessageResponse>created().setPayload(meetingChatService.add(id, request));
    }

    /** Chat de réunion (M2) — fil complet, consultable après la réunion. */
    @GetMapping("/{id}/messages")
    public Response<List<MeetingMessageResponse>> messages(@PathVariable UUID id) {
        return Response.<List<MeetingMessageResponse>>ok().setPayload(meetingChatService.list(id));
    }

    /** Fichiers partagés (M5) — métadonnées captées dans la salle (binaire chez JaaS). */
    @PostMapping("/{id}/files")
    @ResponseStatus(HttpStatus.CREATED)
    public Response<MeetingFileResponse> shareFile(@PathVariable UUID id,
                                                   @Valid @RequestBody ShareMeetingFileRequest request) {
        return Response.<MeetingFileResponse>created().setPayload(meetingChatService.shareFile(id, request));
    }

    /** Fichiers partagés pendant la réunion, consultables après l'appel. */
    @GetMapping("/{id}/files")
    public Response<List<MeetingFileResponse>> files(@PathVariable UUID id) {
        return Response.<List<MeetingFileResponse>>ok().setPayload(meetingChatService.files(id));
    }

    /**
     * Diagnostic JaaS (administrateurs). Un « Authentication failed » n'indique
     * jamais sa cause : ce point d'entrée expose de quoi la trancher en une
     * requête — kid, empreinte et **clé publique** dérivée de notre clé privée
     * (à comparer avec la console 8x8), heure du serveur (dérive d'horloge →
     * `nbf`/`exp` rejetés) et un jeton d'exemple décodable.
     *
     * <p>Aucun secret n'en sort : la clé privée n'est jamais exposée.</p>
     */
    @GetMapping("/jaas-diagnostic")
    public Response<JaasDiagnosticResponse> jaasDiagnostic() {
        return Response.<JaasDiagnosticResponse>ok().setPayload(callService.jaasDiagnostic());
    }

    @GetMapping
    public Response<List<CallResponse>> history() {
        return Response.<List<CallResponse>>ok().setPayload(callService.history());
    }

    /** Appels en cours (ACTIVE) du workspace où l'appelant est convié ou hôte. */
    @GetMapping("/active")
    public Response<List<CallResponse>> active() {
        return Response.<List<CallResponse>>ok().setPayload(callService.activeCalls());
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

    /** Invite des membres internes (workspace) → notification « réunion en cours ». */
    @PostMapping("/{id}/participants")
    public Response<Void> inviteParticipants(@PathVariable UUID id,
                                             @Valid @RequestBody InviteParticipantsRequest request) {
        callService.inviteParticipants(id, request.getUserIds());
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
