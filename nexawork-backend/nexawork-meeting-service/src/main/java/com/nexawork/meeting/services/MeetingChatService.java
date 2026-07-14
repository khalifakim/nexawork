package com.nexawork.meeting.services;

import com.nexawork.meeting.dtos.requests.CreateMeetingMessageRequest;
import com.nexawork.meeting.dtos.requests.ShareMeetingFileRequest;
import com.nexawork.meeting.dtos.responses.MeetingFileResponse;
import com.nexawork.meeting.dtos.responses.MeetingMessageResponse;

import java.util.List;
import java.util.UUID;

/**
 * Contenu d'une réunion : chat persistant (M2, §14.3) et fichiers partagés
 * (M5, §14.4). Les deux sont captés par le client via l'IFrame API JaaS, puis
 * consultables en lecture seule après l'appel. Mêmes règles d'accès : réservé
 * aux participants.
 */
public interface MeetingChatService {

    /** Enregistre un message du chat de l'appel (auteur = appelant). */
    MeetingMessageResponse add(UUID callId, CreateMeetingMessageRequest request);

    /** Fil complet du chat d'un appel, dans l'ordre chronologique. */
    List<MeetingMessageResponse> list(UUID callId);

    /** Enregistre un fichier partagé dans la salle (métadonnées ; binaire chez JaaS). */
    MeetingFileResponse shareFile(UUID callId, ShareMeetingFileRequest request);

    /** Fichiers partagés pendant l'appel, dans l'ordre chronologique. */
    List<MeetingFileResponse> files(UUID callId);
}
