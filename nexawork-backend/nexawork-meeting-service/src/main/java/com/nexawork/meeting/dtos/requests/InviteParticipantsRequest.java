package com.nexawork.meeting.dtos.requests;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Invitation de membres internes à un appel (Lot M1, point #2). Les membres du
 * workspace ajoutés reçoivent une notification « réunion en cours » et peuvent
 * rejoindre tant que l'appel est actif.
 */
@Data
public class InviteParticipantsRequest {

    @NotEmpty(message = "au moins un membre est requis")
    private List<UUID> userIds;
}
