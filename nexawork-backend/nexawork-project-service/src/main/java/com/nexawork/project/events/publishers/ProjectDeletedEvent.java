package com.nexawork.project.events.publishers;

import java.util.UUID;

/**
 * Payload de l'événement {@code project.deleted} (V5.1 §7.2) — publié quand un
 * projet est supprimé. Consommé par le **Messaging Service**, qui supprime alors
 * les canaux du projet : ceux-ci vivent dans une autre base, aucune cascade SQL
 * n'est possible entre microservices. Sans cet événement, les canaux d'un projet
 * supprimé restaient orphelins à vie.
 */
public record ProjectDeletedEvent(
        UUID projectId,
        UUID organisationId) {
}
