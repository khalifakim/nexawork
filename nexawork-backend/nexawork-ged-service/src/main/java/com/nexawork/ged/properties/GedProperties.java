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

    /**
     * Base URL du File Service (context-path inclus). Utilisée pour relayer les
     * octets d'un lien de partage externe (download / upload) au nom d'un visiteur
     * sans compte (Brique 4).
     */
    private String fileServiceUrl = "http://localhost:8086/nexawork-file-api-v1";

    /** Timeout de l'appel synchrone au File Service (ms). */
    private int fileCallTimeoutMs = 20000;
}
