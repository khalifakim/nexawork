package com.nexawork.ged.dtos.requests;

import lombok.Data;

import java.util.UUID;

/**
 * Mise à jour d'un dossier (§11.2) : renommer et/ou déplacer. Champs nuls =
 * inchangés ; {@code moveToRoot=true} déplace à la racine.
 */
@Data
public class UpdateFolderRequest {

    private String name;

    private UUID parentId;

    private Boolean moveToRoot;
}
