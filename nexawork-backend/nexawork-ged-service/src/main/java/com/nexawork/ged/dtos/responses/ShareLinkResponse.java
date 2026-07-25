package com.nexawork.ged.dtos.responses;

import com.nexawork.ged.entities.enums.ShareMode;
import com.nexawork.ged.entities.enums.TargetType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Vue AUTHENTIFIÉE d'un lien de partage (créateur / gestion). Contient le token en
 * clair et le chemin public : c'est le propriétaire du lien qui les consulte.
 */
@Data
@Builder
public class ShareLinkResponse {

    private UUID id;
    private String token;
    /** Chemin public relatif ({@code /s/<token>}) — le front compose l'URL absolue. */
    private String path;
    private TargetType targetType;
    private UUID targetId;
    /** Nom lisible de l'élément ciblé (fichier ou dossier). */
    private String targetName;
    private ShareMode mode;
    private boolean hasPassword;
    private LocalDateTime expiresAt;
    private Integer maxAccess;
    private int accessCount;
    private Long maxUploadBytes;
    private String allowedExtensions;
    private boolean revoked;
    /** Faux dès que révoqué, expiré (date) ou épuisé (nombre d'accès). */
    private boolean active;
    private LocalDateTime createdAt;
}
