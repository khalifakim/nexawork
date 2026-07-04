package com.nexawork.commons.security.rules;

/**
 * Contrat des permissions NexaWork. Chaque microservice fournit son enum
 * `NexaWorkPermissions` (adapté de `SecurityPermissions` Smart-Mifin) qui
 * implémente cette interface — `name()` est fourni nativement par l'enum.
 */
public interface NexaWorkPermission {

    String name();
}
