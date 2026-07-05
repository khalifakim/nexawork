package com.nexawork.meeting.services;

import com.nexawork.meeting.dtos.requests.CreateCallRequest;
import com.nexawork.meeting.dtos.responses.CallResponse;

import java.util.List;
import java.util.UUID;

/**
 * Cycle de vie des appels (§13.6). REF A (unicité : un utilisateur ne peut être
 * dans qu'un seul appel en cours → 409). Le token JaaS est généré à la création
 * et au join.
 */
public interface CallService {

    /** Lance une réunion (crée la salle + token JaaS). REF A : 409 si déjà en appel. */
    CallResponse create(CreateCallRequest request);

    /** Rejoint un appel (token + marquage ONGOING). REF A : 409 ALREADY_IN_CALL. */
    CallResponse join(UUID callId);

    /** Sortie individuelle (libère REF A) sans clore l'appel pour les autres. */
    void leave(UUID callId);

    /** Termine l'appel pour tout le monde (→ call.ended). */
    void end(UUID callId);

    /** Historique des réunions de l'utilisateur (hors masquées). */
    List<CallResponse> history();

    CallResponse get(UUID callId);

    /** Appel ONGOING auquel l'appelant participe, ou {@code null} (source popover header). */
    CallResponse ongoing();
}
