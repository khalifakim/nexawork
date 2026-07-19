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

    /**
     * Fichiers partagés dans la réunion de l'invité — il voit exactement la même
     * liste que les membres.
     */
    java.util.List<com.nexawork.meeting.dtos.responses.MeetingFileResponse> files(String guestToken);

    /** L'invité partage un fichier : relayé au File Service → MinIO (il n'a pas de JWT). */
    com.nexawork.meeting.dtos.responses.MeetingFileResponse shareFile(
            String guestToken, org.springframework.web.multipart.MultipartFile file);

    /** L'invité télécharge un fichier partagé : les octets sont relayés (pas de JWT). */
    byte[] downloadFile(String guestToken, UUID meetingFileId);

    /** Nom du fichier — pour l'en-tête `Content-Disposition` du téléchargement. */
    String fileName(String guestToken, UUID meetingFileId);
}
