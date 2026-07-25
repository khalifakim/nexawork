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
 * Fichier GED (V5.1 §4.4). Rangé dans un dossier OU à la racine de l'espace
 * ({@code folder} nullable, V2). {@code organisationId} porte le scope même sans
 * dossier ; {@code projectId} distingue racine Organisation (null) / racine projet.
 * {@code sourceFileId} pointe vers le StoredFile (File Service). {@code accessMode}
 * porte la visibilité REF G. Les pièces jointes de tâches ne sont PAS matérialisées
 * ici (dossier virtuel, §10.5bis).
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

    /** Dossier conteneur, ou {@code null} si le fichier est à la racine de l'espace (V2). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    private GedFolder folder;

    /** Organisation propriétaire (porte le scope même sans dossier). */
    @Column(name = "organisation_id", nullable = false)
    private UUID organisationId;

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

    /**
     * Paternité d'un dépôt EXTERNE (Brique 4, boîte de dépôt). Renseignés quand le
     * fichier a été déposé par un externe sans compte via un lien de partage :
     * {@code addedByUserId} reste alors le créateur du lien (identité de confiance),
     * et le nom/email déclarés de l'externe sont conservés ici. Null pour un dépôt
     * interne classique.
     */
    @Column(name = "external_uploader_name", length = 120)
    private String externalUploaderName;

    @Column(name = "external_uploader_email", length = 180)
    private String externalUploaderEmail;
}
