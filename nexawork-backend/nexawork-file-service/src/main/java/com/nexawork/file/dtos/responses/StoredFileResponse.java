package com.nexawork.file.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Métadonnées d'un fichier stocké (V5.1 §13.3). {@code sha256} est retourné pour
 * permettre au client de vérifier l'intégrité.
 */
@Data
@Builder
public class StoredFileResponse {

    private UUID id;
    private String originalName;
    private String bucket;
    private String objectKey;
    private String contentType;
    private Long size;
    private String sha256;
    private UUID uploadedByUserId;
    private UUID organisationId;
    private UUID projectId;
    private UUID taskId;
    private LocalDateTime uploadedAt;
}
