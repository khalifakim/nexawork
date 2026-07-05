package com.nexawork.ged.services;

import com.nexawork.ged.dtos.requests.ChangeAccessModeRequest;
import com.nexawork.ged.dtos.requests.CreateGrantRequest;
import com.nexawork.ged.dtos.responses.FileResponse;
import com.nexawork.ged.dtos.responses.GrantResponse;

import java.util.List;
import java.util.UUID;

/**
 * Gestion des accès GED (§11.6/§11.7) : grants Lecteur/Éditeur (R13 propriétaire
 * verrouillé, R16 best-effort), changement de mode d'accès, et vue « Partagé avec
 * moi ». Toute action ciblant le dossier système est rejetée (403).
 */
public interface GedAccessService {

    /** Liste les accès d'une cible : la ligne propriétaire (synthétique, R13) d'abord, puis les grants. */
    List<GrantResponse> listGrants(String targetType, UUID targetId);

    GrantResponse addGrant(CreateGrantRequest request);

    void revokeGrant(UUID grantId);

    /** Bascule OPEN/PRIVATE/SHARED (purge les grants pour OPEN/PRIVATE). */
    void changeFolderAccessMode(UUID folderId, ChangeAccessModeRequest request);

    void changeFileAccessMode(UUID fileId, ChangeAccessModeRequest request);

    /** Fichiers partagés explicitement avec l'appelant (via grants USER). */
    List<FileResponse> sharedWithMe();
}
