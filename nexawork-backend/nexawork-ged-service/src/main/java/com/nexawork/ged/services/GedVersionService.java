package com.nexawork.ged.services;

import com.nexawork.ged.dtos.requests.CreateVersionRequest;
import com.nexawork.ged.dtos.responses.VersionResponse;

import java.util.List;
import java.util.UUID;

/**
 * Versions d'un fichier GED (§11.5). Accès en lecture selon REF G ; ajout/restore
 * réservés au propriétaire/éditeur/ADMIN (R13). Historique append-only.
 */
public interface GedVersionService {

    List<VersionResponse> listVersions(UUID fileId);

    VersionResponse addVersion(UUID fileId, CreateVersionRequest request);

    /** Remet la version choisie comme version actuelle (nouvelle version clonée). */
    VersionResponse restoreVersion(UUID fileId, UUID versionId);
}
