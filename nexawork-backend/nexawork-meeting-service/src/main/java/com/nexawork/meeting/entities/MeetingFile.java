package com.nexawork.meeting.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * Fichier partagé pendant une réunion (M5, V5.1 §14.4) — capté via l'événement
 * {@code fileUploaded} de l'IFrame API JaaS.
 *
 * <p><b>Le binaire n'appartient pas à NexaWork.</b> JaaS héberge le fichier dans
 * la salle ; nous n'en recevons que les métadonnées. {@code fileId} (File Service
 * / MinIO) reste donc nul : on trace ce qui a été partagé, sans prétendre détenir
 * le fichier — et sans inventer un identifiant qui ne pointerait sur rien.</p>
 */
@Entity
@Table(name = "meeting_files")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingFile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "call_id", nullable = false)
    private Call call;

    /** Identifiant du fichier chez JaaS (le nôtre, {@code fileId}, reste nul). */
    @Column(name = "jaas_file_id")
    private String jaasFileId;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_size")
    private Long fileSize;

    /** Auteur interne — nul si le partage vient d'un invité externe (sans compte). */
    @Column(name = "shared_by")
    private UUID sharedBy;

    @Column(name = "shared_by_name")
    private String sharedByName;

    @CreationTimestamp
    @Column(name = "shared_at", nullable = false, updatable = false)
    private LocalDateTime sharedAt;
}
