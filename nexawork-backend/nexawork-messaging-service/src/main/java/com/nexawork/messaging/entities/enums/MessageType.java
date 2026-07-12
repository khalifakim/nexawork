package com.nexawork.messaging.entities.enums;

/**
 * Nature d'un message (V5.1 §4.5). Seuls les utilisateurs émettent des messages
 * (canaux et conversations) — la valeur {@code SYSTEM} (messages générés par la
 * plateforme) a été retirée : elle n'était jamais produite.
 */
public enum MessageType {
    USER
}
