package com.nexawork.commons.exceptions;

/**
 * Fonctionnalité non encore implémentée → 501. Réutilisable pour les endpoints
 * contractuels dont la réalisation est différée (ex. génération de rapport PDF).
 */
public class NotImplementedException extends RuntimeException {

    public NotImplementedException(String message) {
        super(message);
    }
}
