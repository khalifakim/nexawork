package com.nexawork.commons.exceptions;

/**
 * Conflit d'état métier → 409. Générique et réutilisable : état d'une ressource
 * incompatible avec l'opération demandée (ex. REF E — mutation d'un projet
 * archivé ; REF A — utilisateur déjà dans un appel). Distinct de
 * {@link ResourceAlreadyExistException} (doublon d'unicité).
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
