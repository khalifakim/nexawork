package com.nexawork.ged.dtos.responses;

import com.nexawork.ged.entities.enums.AccessMode;
import com.nexawork.ged.entities.enums.FolderType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Dossier GED (§11.2). {@code restricted} = raccourci pour l'icône cadenas
 * (mode ≠ OPEN).
 */
@Data
@Builder
public class FolderResponse {

    private UUID id;
    private String name;
    private UUID parentId;
    private UUID organisationId;
    private UUID projectId;
    private FolderType folderType;
    private AccessMode accessMode;
    private boolean restricted;
    private UUID createdByUserId;
    private LocalDateTime createdAt;
}
