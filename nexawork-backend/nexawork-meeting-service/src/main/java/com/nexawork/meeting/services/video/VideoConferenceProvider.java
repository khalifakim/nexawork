package com.nexawork.meeting.services.video;

/**
 * Port (au sens de l'architecture hexagonale « Ports et Adaptateurs », Cockburn
 * 2005) isolant le domaine métier des réunions du fournisseur de visioconférence.
 *
 * <p>Le {@code meeting-service} orchestre les réunions — création, participants,
 * invitations, persistance des échanges — sans jamais dépendre d'une technologie
 * de visioconférence particulière : il ne connaît que ce contrat. L'implémentation
 * concrète — un <i>adaptateur</i> — traduit ces opérations vers un fournisseur
 * donné ({@link JaasVideoConferenceAdapter} pour JaaS aujourd'hui, une instance
 * Jitsi auto-hébergée demain), sans impact sur le code métier ni sur les autres
 * services.</p>
 */
public interface VideoConferenceProvider {

    /** Nom lisible du fournisseur concret (journaux, diagnostic). */
    String providerName();

    /** Émet un jeton d'accès signé autorisant {@code access} à rejoindre sa salle. */
    String issueAccessToken(RoomAccess access);

    /**
     * Construit l'URL complète de la salle, jeton inclus. Renvoie {@code null}
     * lorsque {@code accessToken} est {@code null} (aucune salle à ouvrir).
     */
    String buildRoomUrl(String roomName, String accessToken);

    /** Diagnostic de la configuration du fournisseur (réservé à l'administration). */
    VideoProviderDiagnostic diagnostic(RoomAccess sampleAccess);
}
