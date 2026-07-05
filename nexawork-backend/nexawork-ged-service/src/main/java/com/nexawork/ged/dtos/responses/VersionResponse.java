package com.nexawork.ged.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Version d'un fichier GED (§11.5). {@code current} = version la plus récente.
 */
@Data
@Builder
public class VersionResponse {

    private UUID id;
    private UUID gedFileId;
    private Integer versionNumber;
    private UUID sourceFileId;
    private String fileUrl;
    private Long fileSize;
    private String note;
    private UUID uploadedBy;
    private LocalDateTime createdAt;
    private boolean current;
}
