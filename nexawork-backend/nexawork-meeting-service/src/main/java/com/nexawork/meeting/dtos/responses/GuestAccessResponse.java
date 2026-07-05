package com.nexawork.meeting.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/**
 * Accès invité externe à une salle (§13.6 — {@code GET /guest/{token}}) : le token
 * JaaS (non modérateur) + l'URL de la salle. Validé si le token n'est pas consommé
 * et que l'appel est actif.
 */
@Data
@Builder
public class GuestAccessResponse {

    private UUID callId;
    private String topic;
    private String displayName;
    private String jitsiUrl;
    private String jwt;
}
