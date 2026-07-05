package com.nexawork.ged.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Version d'un fichier GED (V5.1 §4.4). Composition dans un GedFile (cascade).
 * Chaque version pointe vers un StoredFile distinct. Numéro séquentiel unique par
 * fichier.
 */
@Entity
@Table(name = "ged_file_versions",
        uniqueConstraints = @UniqueConstraint(name = "uk_ged_file_versions_number",
                columnNames = {"ged_file_id", "version_number"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GedFileVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ged_file_id", nullable = false)
    private GedFile gedFile;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "source_file_id", nullable = false)
    private UUID sourceFileId;

    @Column(name = "file_url", nullable = false, length = 1024)
    private String fileUrl;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "note")
    private String note;

    @Column(name = "uploaded_by", nullable = false)
    private UUID uploadedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
