package com.nexawork.ged.dtos.responses;

import com.nexawork.ged.entities.enums.ShareMode;
import com.nexawork.ged.entities.enums.TargetType;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Vue PUBLIQUE d'un lien (visiteur sans compte). Volontairement minimale : rien de
 * sensible n'est révélé tant que le lien n'est pas « déverrouillé » ({@link #unlocked}
 * = pas de mot de passe, ou mot de passe correct fourni). Aucune information sur le
 * workspace, les autres fichiers, ni les membres n'y figure (isolation stricte).
 */
@Data
@Builder
public class PublicShareResponse {

    private ShareMode mode;
    private TargetType targetType;

    /** Le lien est-il encore exploitable ? Faux si révoqué / expiré / épuisé. */
    private boolean active;
    /** Motif si inactif : {@code EXPIRED} | {@code REVOKED} | {@code EXHAUSTED} (sinon {@code ACTIVE}). */
    private String reason;

    private boolean passwordRequired;
    /** Vrai si aucun mot de passe, ou mot de passe correct fourni : les détails ci-dessous sont alors renseignés. */
    private boolean unlocked;

    /** Nom de l'élément ciblé (null tant que verrouillé). */
    private String targetName;

    // ─── READ / cible FICHIER ───
    private String fileName;
    private String contentType;
    private Long fileSize;

    // ─── READ / cible DOSSIER ───
    private List<PublicShareFileResponse> files;

    /** Accès restants avant épuisement (null si illimité). */
    private Integer remainingAccess;

    // ─── DROP (boîte de dépôt) ───
    private Long maxUploadBytes;
    private String allowedExtensions;
}
