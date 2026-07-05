package com.nexawork.meeting.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/**
 * Résultat d'une invitation externe (§13.6) : le lien invité à transmettre.
 */
@Data
@Builder
public class GuestInviteResponse {

    private UUID guestId;
    private String email;
    private String displayName;
    private String guestToken;
    /** Lien d'accès invité (frontend /guest/{token}). */
    private String guestLink;
}
