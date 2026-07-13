package com.nexawork.meeting.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Ingestion d'un message du chat de réunion (M2). Le contenu est capté par le
 * client via l'IFrame API JaaS ; l'auteur est déduit du jeton de l'appelant.
 */
@Data
public class CreateMeetingMessageRequest {

    @NotBlank(message = "est obligatoire")
    private String content;
}
