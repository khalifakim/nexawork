package com.nexawork.ged.dtos.requests;

import com.nexawork.ged.entities.enums.AccessMode;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

/**
 * Création d'un dossier GED (§11.3). {@code parentId} nul = racine. {@code projectId}
 * nul = GED organisation. {@code accessMode} par défaut OPEN. Le dossier système
 * TASK_ATTACHMENTS ne peut pas être créé par cette voie.
 */
@Data
public class CreateFolderRequest {

    @NotBlank(message = "est obligatoire")
    private String name;

    private UUID parentId;

    private UUID projectId;

    private AccessMode accessMode;
}
