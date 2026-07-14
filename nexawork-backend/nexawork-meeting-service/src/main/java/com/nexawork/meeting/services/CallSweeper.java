package com.nexawork.meeting.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Filet de sécurité du cycle de vie des appels : clôt périodiquement les appels
 * restés ACTIVE alors que plus personne n'est dans la salle.
 *
 * <p>Sans lui, un appel créé mais jamais rejoint n'est clos par personne :
 * {@code leave()} ne se déclenche qu'au départ d'un participant *entré*. L'appel
 * restait alors ACTIVE indéfiniment (bannière « Appel en cours » perpétuelle, et
 * REF A refusant toute réunion suivante). Cas réellement observé : un appel resté
 * actif près de 4 heures.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CallSweeper {

    private final CallService callService;

    /**
     * Une erreur ici ne doit jamais tuer l'ordonnanceur : une exception non
     * rattrapée dans une tâche {@code @Scheduled} en annule les exécutions
     * suivantes, et le balayage cesserait silencieusement.
     */
    @Scheduled(
            initialDelayString = "${nexawork.meeting.sweep-initial-delay-ms:60000}",
            fixedDelayString = "${nexawork.meeting.sweep-interval-ms:300000}")
    public void sweep() {
        try {
            callService.sweepStaleCalls();
        } catch (Exception e) {
            log.error("Balayage des appels abandonnés en échec — réessai au prochain cycle.", e);
        }
    }
}
