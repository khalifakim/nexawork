package com.nexawork.ged.dtos.responses;

import com.nexawork.ged.entities.enums.AccessMode;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Fichier GED (§11.2).
 */
@Data
@Builder
public class FileResponse {

    private UUID id;
    private UUID folderId;
    private String name;
    private String fileUrl;
    private Long fileSize;
    private String contentType;
    private UUID sourceFileId;
    private UUID projectId;
    private AccessMode accessMode;
    private boolean restricted;
    private UUID addedByUserId;
    private LocalDateTime addedAt;
    private LocalDateTime deletedAt;
}
