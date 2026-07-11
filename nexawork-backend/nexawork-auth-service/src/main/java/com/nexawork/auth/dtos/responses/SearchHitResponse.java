package com.nexawork.auth.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/**
 * Résultat de recherche globale (§4.8). Forme commune à tous les services :
 * la Gateway agrège les listes renvoyées par chaque domaine.
 */
@Data
@Builder
public class SearchHitResponse {

    /** Domaine du résultat : taches, projets, documents, canaux, messages, personnes. */
    private String type;
    private UUID id;
    private String name;
    /** Contexte affiché sous le nom (email, fonction…). */
    private String ctx;
    private String mono;
    private String color;
}
