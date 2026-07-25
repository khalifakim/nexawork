package com.nexawork.ged.services;

import com.nexawork.ged.dtos.requests.CreateShareLinkRequest;
import com.nexawork.ged.dtos.responses.PublicShareFileResponse;
import com.nexawork.ged.dtos.responses.PublicShareResponse;
import com.nexawork.ged.dtos.responses.ShareLinkResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * Liens de partage externes (Brique 4). Deux surfaces bien distinctes :
 * <ul>
 *   <li><b>authentifiée</b> — le propriétaire crée, liste et révoque ses liens ;</li>
 *   <li><b>publique</b> — un visiteur sans compte présente un token : résolution,
 *       téléchargement (relayé) et dépôt (relayé), tout validé côté serveur.</li>
 * </ul>
 */
public interface SharedLinkService {

    /** Octets d'un fichier relayés au visiteur (le File Service exigerait un JWT). */
    record DownloadedFile(byte[] bytes, String fileName, String contentType) {
    }

    // ─── Authentifié ────────────────────────────────────────────────────────────

    ShareLinkResponse create(CreateShareLinkRequest request);

    List<ShareLinkResponse> myLinks();

    void revoke(UUID id);

    // ─── Public (token) ──────────────────────────────────────────────────────────

    /** Métadonnées publiques + état ; détails sensibles seulement si déverrouillé. */
    PublicShareResponse resolve(String token, String password);

    /** READ + cible fichier : télécharge le fichier ciblé. */
    DownloadedFile downloadTargetFile(String token, String password);

    /** READ + cible dossier : télécharge UN fichier appartenant au dossier partagé. */
    DownloadedFile downloadFolderFile(String token, UUID fileId, String password);

    /** DROP : dépôt d'un fichier par un externe dans le dossier ciblé. */
    PublicShareFileResponse upload(String token, MultipartFile file,
                                   String uploaderName, String uploaderEmail, String password);
}
