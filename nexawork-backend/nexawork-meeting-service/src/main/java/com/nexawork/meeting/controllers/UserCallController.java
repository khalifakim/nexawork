package com.nexawork.meeting.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.meeting.dtos.responses.CallResponse;
import com.nexawork.meeting.services.CallService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Hydratation de session (§13.6 — {@code GET /users/me/ongoing-call}) : permet au
 * frontend de restaurer l'état « appel en cours » après un refresh.
 */
@RestController
@RequestMapping("/api/v1/users/me")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserCallController {

    CallService callService;

    @GetMapping("/ongoing-call")
    public Response<CallResponse> ongoingCall() {
        return Response.<CallResponse>ok().setPayload(callService.ongoing());
    }
}
