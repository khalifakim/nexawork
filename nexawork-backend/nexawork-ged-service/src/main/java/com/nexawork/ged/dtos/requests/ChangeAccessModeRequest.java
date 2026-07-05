package com.nexawork.ged.dtos.requests;

import com.nexawork.ged.entities.enums.AccessMode;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Changement de mode d'accès d'un dossier/fichier (§11.6). Le passage à OPEN
 * retire toutes les restrictions existantes (grants purgés). Le passage à
 * PRIVATE purge aussi les grants. Vers SHARED : les grants sont gérés via
 * {@code /grants}.
 */
@Data
public class ChangeAccessModeRequest {

    @NotNull(message = "est obligatoire")
    private AccessMode accessMode;
}
