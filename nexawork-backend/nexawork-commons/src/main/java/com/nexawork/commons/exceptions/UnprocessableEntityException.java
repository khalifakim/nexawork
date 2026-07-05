package com.nexawork.commons.exceptions;

/**
 * Entité sémantiquement invalide → 422. Générique et réutilisable : la requête
 * est bien formée mais viole une règle métier de traitement (ex. transition de
 * workflow Kanban refusée — V5.1 §13.8, §10.2).
 */
public class UnprocessableEntityException extends RuntimeException {

    public UnprocessableEntityException(String message) {
        super(message);
    }
}
