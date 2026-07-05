package com.nexawork.commons.exceptions;

/**
 * Dépendance amont indisponible → 503. Réutilisable : un appel inter-services
 * synchrone échoue ou dépasse son délai (ex. GED → Project pour le dossier
 * virtuel « Pièces jointes aux tâches », V5.1 §10.5bis — mieux vaut une erreur
 * explicite qu'un contenu partiel ou périmé).
 */
public class ServiceUnavailableException extends RuntimeException {

    public ServiceUnavailableException(String message) {
        super(message);
    }
}
