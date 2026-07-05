package com.nexawork.ged.dtos.requests;

import lombok.Data;

/**
 * Mise à jour d'un fichier GED (§11.2) : renommer. Champs nuls = inchangés.
 */
@Data
public class UpdateFileRequest {

    private String name;
}
