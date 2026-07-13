package com.nexawork.project.dtos.requests;

import lombok.Data;

/**
 * Mise à jour d'une équipe (§10) : renommage et/ou couleur. Champs optionnels —
 * seuls les non-nuls sont appliqués.
 */
@Data
public class UpdateTeamRequest {

    private String name;

    private String color;
}
