package com.nexawork.messaging.dtos.requests;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

/**
 * Ouverture (ou récupération) d'une conversation directe avec un autre
 * utilisateur (§13.5). Si une conversation DIRECT existe déjà entre les deux,
 * elle est retournée (unicité).
 */
@Data
public class CreateConversationRequest {

    @NotNull(message = "est obligatoire")
    private UUID userId;
}
