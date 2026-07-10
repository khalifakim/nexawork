package com.nexawork.auth.services;

import com.nexawork.auth.dtos.requests.AcceptInvitationRequest;
import com.nexawork.auth.dtos.requests.CreateInvitationsRequest;
import com.nexawork.auth.dtos.responses.AuthResponse;
import com.nexawork.auth.dtos.responses.InvitationContextResponse;
import com.nexawork.auth.dtos.responses.InvitationResponse;

import java.util.List;
import java.util.UUID;

/**
 * Invitations (§13.1, §3.2) : envoi multiple (email + event member.invited),
 * relance, annulation, contexte public par token, acceptation.
 */
public interface InvitationService {

    List<InvitationResponse> list(UUID workspaceId);

    List<InvitationResponse> send(UUID workspaceId, CreateInvitationsRequest request);

    InvitationResponse resend(UUID invitationId);

    void cancel(UUID invitationId);

    InvitationContextResponse getContext(String token);

    AuthResponse accept(String token, AcceptInvitationRequest request);

    /**
     * Acceptation par un utilisateur DÉJÀ inscrit (§3.2) : l'appelant authentifié
     * (dont l'email doit correspondre à l'invitation) rejoint le workspace sans
     * re-saisir son profil. Renvoie une session scellée sur ce workspace.
     */
    AuthResponse join(String token);
}
