package com.nexawork.ged.entities;

import com.nexawork.ged.entities.enums.AccessMode;
import com.nexawork.ged.entities.enums.FolderType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Dossier GED (V5.1 §4.4). Auto-référence via {@code parentId} (null = racine).
 * {@code folderType} distingue les dossiers USER (classiques) du dossier système
 * TASK_ATTACHMENTS (contenu virtuel). {@code accessMode} porte la visibilité
 * REF G (ajout V5.1). Références logiques cross-services sans FK.
 */
@Entity
@Table(name = "ged_folders")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GedFolder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    /** Dossier parent (null = racine). Auto-référence logique, no-cascade. */
    @Column(name = "parent_id")
    private UUID parentId;

    @Column(name = "organisation_id", nullable = false)
    private UUID organisationId;

    /** Projet de rattachement (null = GED organisation). */
    @Column(name = "project_id")
    private UUID projectId;

    @Enumerated(EnumType.STRING)
    @Column(name = "folder_type", nullable = false, length = 20)
    private FolderType folderType;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_mode", nullable = false, length = 10)
    private AccessMode accessMode;

    @Column(name = "created_by_user_id", nullable = false)
    private UUID createdByUserId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
