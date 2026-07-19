package com.nexawork.project.events.publishers;

import java.util.UUID;

/**
 * {@code project.member-added} — un utilisateur vient d'être ajouté à un projet
 * (§4.7). Consommé par le Notification Service : le membre ajouté est notifié.
 */
public record AddedToProjectEvent(
        UUID recipientUserId,
        UUID projectId,
        String projectName,
        UUID organisationId,
        UUID addedByUserId) {
}
