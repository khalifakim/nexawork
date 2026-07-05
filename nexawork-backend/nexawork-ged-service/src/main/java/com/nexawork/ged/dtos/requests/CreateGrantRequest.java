package com.nexawork.ged.dtos.requests;

import com.nexawork.ged.entities.enums.AccessLevel;
import com.nexawork.ged.entities.enums.GranteeType;
import com.nexawork.ged.entities.enums.TargetType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

/**
 * Octroi d'un accès Lecteur/Éditeur sur un dossier ou fichier (§11.6/§11.7).
 * Bascule automatiquement la cible en mode SHARED. R13 : on ne peut pas viser le
 * propriétaire. R16 (best-effort) : bénéficiaire selon la portée.
 */
@Data
public class CreateGrantRequest {

    @NotNull(message = "est obligatoire")
    private TargetType targetType;

    @NotNull(message = "est obligatoire")
    private UUID targetId;

    @NotNull(message = "est obligatoire")
    private GranteeType granteeType;

    @NotNull(message = "est obligatoire")
    private UUID granteeId;

    @NotNull(message = "est obligatoire")
    private AccessLevel accessLevel;
}
