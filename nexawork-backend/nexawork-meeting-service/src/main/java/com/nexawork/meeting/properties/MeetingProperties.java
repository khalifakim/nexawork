package com.nexawork.meeting.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Bloc {@code nexawork.meeting} du config-repo.
 */
@Data
@ConfigurationProperties(prefix = "nexawork.meeting")
public class MeetingProperties {

    /** Base URL du frontend pour le lien d'accès invité (/guest/{token}). */
    private String frontendBaseUrl = "http://localhost:4200";

    /**
     * Délai au bout duquel un appel dont la salle est vide est clos d'office.
     * Sans lui, un appel créé mais jamais rejoint (l'hôte n'entre pas dans la
     * salle) reste ACTIVE indéfiniment : bannière « Appel en cours » perpétuelle
     * et REF A refusant toute réunion suivante. Compté depuis le départ du
     * dernier participant, ou depuis le début de l'appel si personne n'est
     * jamais entré.
     */
    private int abandonTimeoutMinutes = 15;

    /** Plafond dur : aucun appel ne reste ACTIVE au-delà, quoi qu'il arrive. */
    private int maxDurationHours = 12;
}
