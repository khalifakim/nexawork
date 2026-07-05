package com.nexawork.messaging.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Envoi d'un message dans un canal ou une conversation (§13.5). Les mentions sont
 * extraites du contenu à l'envoi (parsing @@@/@@/@/#). Pièce jointe optionnelle
 * (URL fournie par le File Service en amont).
 */
@Data
public class SendMessageRequest {

    @NotBlank(message = "est obligatoire")
    private String content;

    private String attachmentUrl;

    private String attachmentName;
}
