package com.nexawork.project.dtos.requests;

import com.nexawork.project.entities.enums.StatusCategory;
import lombok.Data;

/**
 * Mise à jour partielle d'un statut Kanban (§8.2.1) : renommer, recolorer,
 * recatégoriser, réordonner. Un changement de catégorie re-dérive
 * {@code isInitial}/{@code isFinal}. Champs nuls = inchangés.
 */
@Data
public class UpdateStatusRequest {

    private String name;

    private String color;

    private StatusCategory category;

    private Integer position;
}
