package com.nexawork.ged.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

/**
 * Nouvelle version d'un fichier GED (§11.5). Le binaire est stocké au préalable
 * par le File Service ; ici on enregistre la version + réf. StoredFile + URL.
 * Le numéro de version est attribué automatiquement (max + 1).
 */
@Data
public class CreateVersionRequest {

    @NotNull(message = "est obligatoire")
    private UUID sourceFileId;

    @NotBlank(message = "est obligatoire")
    private String fileUrl;

    private Long fileSize;

    private String note;
}
