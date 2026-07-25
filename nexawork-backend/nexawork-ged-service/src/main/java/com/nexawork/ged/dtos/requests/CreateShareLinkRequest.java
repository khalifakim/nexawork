package com.nexawork.ged.dtos.requests;

import com.nexawork.ged.entities.enums.ShareMode;
import com.nexawork.ged.entities.enums.TargetType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Création d'un lien de partage externe (Brique 4, endpoint authentifié).
 *
 * <p>Toutes les limites sont optionnelles et cumulables : sans aucune, le lien est
 * permanent et ouvert (mais toujours borné au seul élément ciblé et révocable).</p>
 */
@Data
public class CreateShareLinkRequest {

    @NotNull(message = "est obligatoire")
    private TargetType targetType;

    @NotNull(message = "est obligatoire")
    private UUID targetId;

    @NotNull(message = "est obligatoire")
    private ShareMode mode;

    /** Mot de passe en clair (optionnel) — haché côté serveur, jamais stocké en clair. */
    private String password;

    /** Expiration par date (optionnelle). */
    private LocalDateTime expiresAt;

    /** Expiration par nombre d'accès (optionnelle ; 1 = usage unique). */
    private Integer maxAccess;

    /** Taille max par fichier déposé (mode DROP, optionnel). */
    private Long maxUploadBytes;

    /** Extensions autorisées au dépôt, CSV (mode DROP, optionnel ; ex. « pdf,png,docx »). */
    private String allowedExtensions;
}
