package com.nexawork.commons.exceptions;

/**
 * Requête métier invalide → 400 (ex. R18 : self-modification ou mutation d'un
 * OWNER ; REF C : self-leave du propriétaire).
 */
public class InvalidRequestException extends RuntimeException {

    public InvalidRequestException(String message) {
        super(message);
    }
}
