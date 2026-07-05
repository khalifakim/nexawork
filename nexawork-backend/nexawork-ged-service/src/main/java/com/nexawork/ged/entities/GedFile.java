package com.nexawork.ged.entities;

import com.nexawork.ged.entities.enums.AccessMode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
 * Fichier GED (V5.1 §4.4). Composition dans un dossier (cascade). {@code sourceFileId}
 * pointe vers le StoredFile (File Service). {@code accessMode} porte la visibilité
 * REF G (ajout V5.1). Les pièces jointes de tâches ne sont PAS matérialisées ici
 * (dossier virtuel, §10.5bis).
 */
@Entity
@Table(name = "ged_files")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GedFile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "folder_id", nullable = false)
    private GedFolder folder;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "file_url", nullable = false, length = 1024)
    private String fileUrl;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "content_type")
    private String contentType;

    /** Réf. StoredFile (File Service), nullable. */
    @Column(name = "source_file_id")
    private UUID sourceFileId;

    @Column(name = "project_id")
    private UUID projectId;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_mode", nullable = false, length = 10)
    private AccessMode accessMode;

    @Column(name = "added_by_user_id", nullable = false)
    private UUID addedByUserId;

    @CreationTimestamp
    @Column(name = "added_at", nullable = false, updatable = false)
    private LocalDateTime addedAt;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "last_opened_at")
    private LocalDateTime lastOpenedAt;

    @Column(name = "last_opened_by")
    private UUID lastOpenedBy;
}
