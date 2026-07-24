package com.nexawork.messaging.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Ajout/retrait (toggle) d'une réaction emoji sur un message (§13.5).
 */
@Data
public class ReactRequest {

    @NotBlank(message = "est obligatoire")
    private String emoji;
}
