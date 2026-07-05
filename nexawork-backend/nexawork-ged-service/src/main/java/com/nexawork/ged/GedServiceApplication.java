package com.nexawork.ged;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * NexaWork GED Service (port 8087) — gestion électronique de documents :
 * arborescence par workspace/projet, versionnage, droits d'accès granulaires,
 * corbeille (soft-delete), dossier système virtuel « Pièces jointes aux tâches »
 * (V5.1 §4.4, §11, §13.4).
 *
 * <p>Identité via headers Gateway (pas de secret JWT). Consomme
 * {@code project.created} (crée les dossiers racine + système). Interroge le
 * Project Service en HTTP synchrone pour le dossier virtuel (§10.5bis).</p>
 */
@SpringBootApplication(scanBasePackages = {
        "com.nexawork.ged",
        "com.nexawork.commons.config",
        "com.nexawork.commons.exceptions"
})
@ConfigurationPropertiesScan
public class GedServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(GedServiceApplication.class, args);
    }
}
