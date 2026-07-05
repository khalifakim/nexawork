package com.nexawork.file.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * Fichier stocké (V5.1 §4.3, §5.3). Entité autonome : aucune relation JPA,
 * uniquement des identifiants logiques cross-services (organisationId, projectId,
 * taskId). Le SHA-256 garantit l'intégrité ; bucket + objectKey localisent l'objet
 * dans MinIO.
 */
@Entity
@Table(name = "stored_files")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoredFile {

    // Id assigné par l'application (pré-généré avant l'upload pour servir de
    // feuille de clé d'objet MinIO) — pas de @GeneratedValue, sinon Hibernate
    // interpréterait l'id pré-défini comme une entité existante (UPDATE).
    @Id
    private UUID id;

    @Column(name = "original_name", nullable = false)
    private String originalName;

    @Column(name = "stored_name", nullable = false, length = 512)
    private String storedName;

    @Column(name = "bucket", nullable = false)
    private String bucket;

    @Column(name = "object_key", nullable = false, length = 512)
    private String objectKey;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "size")
    private Long size;

    /** Empreinte SHA-256 (hex) calculée en streaming à l'upload. */
    @Column(name = "sha256", length = 64)
    private String sha256;

    @Column(name = "uploaded_by_user_id", nullable = false)
    private UUID uploadedByUserId;

    @Column(name = "organisation_id")
    private UUID organisationId;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "task_id")
    private UUID taskId;

    @CreationTimestamp
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private LocalDateTime uploadedAt;
}
