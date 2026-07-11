package com.nexawork.meeting.services;

import com.nexawork.meeting.dtos.requests.CreateMeetingMessageRequest;
import com.nexawork.meeting.dtos.responses.MeetingMessageResponse;

import java.util.List;
import java.util.UUID;

/**
 * Chat de réunion persistant (F5, §14.3). Ingestion des messages captés par le
 * client (IFrame API JaaS) et consultation en lecture seule du fil.
 */
public interface MeetingChatService {

    /** Enregistre un message du chat de l'appel (auteur = appelant). */
    MeetingMessageResponse add(UUID callId, CreateMeetingMessageRequest request);

    /** Fil complet du chat d'un appel, dans l'ordre chronologique. */
    List<MeetingMessageResponse> list(UUID callId);
}
