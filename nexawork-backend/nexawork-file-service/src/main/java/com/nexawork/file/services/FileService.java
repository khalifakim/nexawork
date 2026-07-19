package com.nexawork.file.services;

import com.nexawork.file.dtos.requests.UploadContextParams;
import com.nexawork.file.dtos.responses.PresignedUrlResponse;
import com.nexawork.file.dtos.responses.StoredFileResponse;
import com.nexawork.file.entities.StoredFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * Orchestration du stockage de fichiers (V5.1 §13.3) : upload contextuel (routage
 * bucket + SHA-256 + persistance), consultation, URL présignée, download, delete.
 */
public interface FileService {

    StoredFileResponse upload(String context, MultipartFile file, UploadContextParams params);

    StoredFileResponse getMetadata(UUID id);

    PresignedUrlResponse presignedUrl(UUID id);

    /** Charge l'entité (pour le stream de download côté contrôleur). */
    StoredFile getEntity(UUID id);

    /**
     * Comme {@link #getEntity(UUID)}, mais **refuse tout ce qui n'est pas un avatar**
     * (404). Garde de la route publique {@code /files/{id}/avatar} : sans elle, cette
     * route servirait n'importe quel document du workspace sans authentification.
     */
    StoredFile getAvatarEntity(UUID id);

    void delete(UUID id);
}
