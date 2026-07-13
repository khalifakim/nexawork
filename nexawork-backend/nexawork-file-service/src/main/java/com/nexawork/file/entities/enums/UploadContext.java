package com.nexawork.file.entities.enums;

import java.util.Arrays;
import java.util.Optional;

/**
 * Contexte d'upload (paramètre {@code context} obligatoire, V5.1 §5.3). Détermine
 * le bucket cible et la structure de clé. La valeur reçue est le libellé
 * « dash-case » attendu de l'API ({@link #getWireValue()}).
 */
public enum UploadContext {

    AVATAR("avatar"),
    CHANNEL_MSG("channel-msg"),
    CONVERSATION_MSG("conversation-msg"),
    GED("ged"),
    TASK_ATTACHMENT("task-attachment");
    // MEETING_FILE retiré : le partage de fichiers en réunion (M5) est en perspective.

    private final String wireValue;

    UploadContext(String wireValue) {
        this.wireValue = wireValue;
    }

    public String getWireValue() {
        return wireValue;
    }

    /** Résout le contexte depuis la valeur de l'API ({@code Optional.empty()} si inconnu → 400). */
    public static Optional<UploadContext> fromWire(String value) {
        if (value == null) {
            return Optional.empty();
        }
        return Arrays.stream(values())
                .filter(c -> c.wireValue.equalsIgnoreCase(value.trim()))
                .findFirst();
    }
}
