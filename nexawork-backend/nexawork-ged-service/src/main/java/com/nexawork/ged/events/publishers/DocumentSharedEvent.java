package com.nexawork.ged.events.publishers;

import java.util.UUID;

/**
 * {@code document.shared} — un document (dossier ou fichier) vient d'être partagé
 * avec un utilisateur (§11.6/§4.7). Consommé par le Notification Service.
 *
 * <p>Émis uniquement pour un partage <b>USER</b> nouvellement créé : le GED ne
 * connaît pas la composition des équipes (domaine Project), un partage TEAM ne
 * peut donc pas être déployé en destinataires ici.</p>
 */
public record DocumentSharedEvent(
        UUID recipientUserId,
        String documentName,
        String targetType,
        UUID targetId,
        UUID organisationId,
        UUID sharedByUserId) {
}
