package com.nexawork.meeting.services.video;

import java.util.UUID;

/**
 * Demande d'accès à une salle de visioconférence, indépendante du fournisseur.
 * Objet-valeur passé au {@link VideoConferenceProvider} (port) pour émettre un
 * jeton d'accès : il décrit QUI rejoint QUELLE salle et AVEC QUELS droits, sans
 * rien présumer de la technologie sous-jacente (JaaS, Jitsi auto-hébergé, …).
 *
 * @param roomName    identifiant technique de la salle
 * @param userId      identifiant de l'utilisateur ({@code null} pour un invité externe)
 * @param displayName nom affiché dans la salle
 * @param email       adresse e-mail (peut être {@code null})
 * @param moderator   {@code true} si le participant est modérateur de la salle
 * @param lobbyBypass {@code true} pour entrer directement, {@code false} pour passer
 *                    par la salle d'attente
 */
public record RoomAccess(
        String roomName,
        UUID userId,
        String displayName,
        String email,
        boolean moderator,
        boolean lobbyBypass) {
}
