package com.nexawork.ged.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Bloc YAML {@code nexawork.ged} du config-repo : paramètres de l'appel synchrone
 * GED → Project pour le contenu du dossier virtuel « Pièces jointes aux tâches »
 * (V5.1 §10.5bis).
 */
@Data
@ConfigurationProperties(prefix = "nexawork.ged")
public class GedProperties {

    /** Base URL du Project Service (context-path inclus). */
    private String projectServiceUrl;

    /** Timeout de l'appel synchrone (ms) : au-delà → 503 (pas de contenu partiel). */
    private int projectCallTimeoutMs = 3000;
}
