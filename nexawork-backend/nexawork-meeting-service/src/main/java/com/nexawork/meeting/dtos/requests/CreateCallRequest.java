package com.nexawork.meeting.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

/**
 * Lancement d'une réunion (§13.6). Le sujet est obligatoire ; le projet est
 * optionnel (une réunion peut être rattachée à un projet ou non).
 */
@Data
public class CreateCallRequest {

    @NotBlank(message = "est obligatoire")
    private String topic;

    private UUID projectId;
}
