package com.nexawork.meeting.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.meeting.dtos.responses.GuestAccessResponse;
import com.nexawork.meeting.services.GuestService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Accès invité externe (V5.1 §4.6). <b>Public</b> (non authentifié) : l'invité
 * n'a pas de compte, il présente son token à usage unique et reçoit un token JaaS
 * non modérateur pour rejoindre la salle.
 */
@RestController
@RequestMapping("/api/v1/guest")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GuestController {

    GuestService guestService;

    /** Résout un lien d'invité en accès à la salle (404 si token inconnu, 409 si réunion inactive). */
    @GetMapping("/{token}")
    public Response<GuestAccessResponse> access(@PathVariable String token) {
        return Response.<GuestAccessResponse>ok().setPayload(guestService.access(token));
    }
}
