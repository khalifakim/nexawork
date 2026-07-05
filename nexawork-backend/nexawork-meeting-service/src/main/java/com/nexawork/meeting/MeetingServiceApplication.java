package com.nexawork.meeting;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * NexaWork Meeting Service (port 8084, EN DERNIER) — visioconférence via JaaS
 * (8x8.vc). Génère des JWT RS256 signés (clé privée NexaWork), gère le cycle de
 * vie des appels et des participants, applique REF A (unicité d'appel) et REF B
 * (suppression ADMIN+OWNER). Publie {@code call.ended} et {@code external.guest.invited}
 * (V5.1 §4.6, §9.9, §13.6).
 *
 * <p>Identité via headers Gateway (pas de secret JWT applicatif — distinct de la
 * clé JaaS). Aucun conteneur Jitsi local : NexaWork ne fournit que la signature.</p>
 */
@SpringBootApplication(scanBasePackages = {
        "com.nexawork.meeting",
        "com.nexawork.commons.config",
        "com.nexawork.commons.exceptions"
})
@ConfigurationPropertiesScan
public class MeetingServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(MeetingServiceApplication.class, args);
    }
}
