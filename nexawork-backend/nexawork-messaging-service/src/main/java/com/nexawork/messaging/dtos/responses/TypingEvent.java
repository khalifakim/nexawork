package com.nexawork.messaging.dtos.responses;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Événement « untel est en train d'écrire » (V5.1 §7.5). Diffusé en temps réel sur
 * le topic de la conversation. Volatile : n'est jamais persisté. {@code typing=false}
 * signale l'arrêt de la saisie.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TypingEvent {

    /** Auteur de la saisie (les clients ignorent leur propre événement). */
    private UUID userId;

    /** Vrai pendant la saisie, faux à l'arrêt. */
    private boolean typing;
}
