package com.nexawork.messaging.entities.enums;

/**
 * Nature d'un message (V5.1 §4.5) : émis par un utilisateur ou message système
 * (ex. « Réunion terminée », créé par le consumer {@code call.ended}).
 */
public enum MessageType {
    USER,
    SYSTEM
}
