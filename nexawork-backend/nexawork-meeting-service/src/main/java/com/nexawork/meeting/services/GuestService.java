package com.nexawork.meeting.services;

import com.nexawork.meeting.dtos.requests.InviteGuestRequest;
import com.nexawork.meeting.dtos.responses.GuestAccessResponse;
import com.nexawork.meeting.dtos.responses.GuestInviteResponse;

import java.util.UUID;

/**
 * Invités externes d'un appel (§13.6). Invitation par token à usage unique +
 * publication de {@code external.guest.invited} ; accès invité à la salle (token
 * JaaS non modérateur).
 */
public interface GuestService {

    GuestInviteResponse invite(UUID callId, InviteGuestRequest request);

    /** Accès invité via token (public, non authentifié). 404 si token inconnu/consommé. */
    GuestAccessResponse access(String guestToken);
}
