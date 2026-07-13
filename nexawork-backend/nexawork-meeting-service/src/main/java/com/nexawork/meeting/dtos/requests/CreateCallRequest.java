package com.nexawork.meeting.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Lancement d'une réunion (§13.6). Le sujet est obligatoire. La réunion est
 * rattachée au workspace de l'appelant. {@code memberIds} optionnel (Lot M1) :
 * membres internes conviés dès la création (notifiés).
 */
@Data
public class CreateCallRequest {

    @NotBlank(message = "est obligatoire")
    private String topic;

    private List<UUID> memberIds;
}
