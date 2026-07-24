package com.nexawork.messaging.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Modification du contenu d'un message (§13.5). Réservée à l'auteur et à une
 * fenêtre de temps après l'envoi (validé en service). Un message modifié ne peut
 * pas devenir vide.
 */
@Data
public class EditMessageRequest {

    @NotBlank(message = "est obligatoire")
    private String content;
}
