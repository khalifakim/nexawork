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
 * Fichier partagé pendant une réunion (M5, V5.1 §14.4).
 *
 * <p><b>Le binaire appartient à NexaWork.</b> Le partage passe par notre propre
 * bouton dans la salle (et non par celui de JaaS, qui téléverserait chez 8x8 sans
 * jamais nous laisser le fichier) : le binaire transite par le <b>File Service</b>
 * et est stocké dans <b>MinIO</b> (bucket {@code nexawork-documents}, contexte
 * {@code meeting-file}). {@code fileId} pointe donc un vrai {@code StoredFile}, et
 * le fichier reste <b>téléchargeable</b> depuis l'historique de la réunion, bien
 * après la fin de l'appel.</p>
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

    /** Réf. {@code StoredFile} (File Service / MinIO) — le binaire est à nous. */
    @Column(name = "file_id")
    private UUID fileId;

    /** URL de téléchargement stable, servie par le File Service. */
    @Column(name = "download_url", length = 1024)
    private String downloadUrl;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "content_type")
    private String contentType;

    /** Auteur interne — nul si le partage vient d'un invité externe (sans compte). */
    @Column(name = "shared_by")
    private UUID sharedBy;

    @Column(name = "shared_by_name")
    private String sharedByName;

    @CreationTimestamp
    @Column(name = "shared_at", nullable = false, updatable = false)
    private LocalDateTime sharedAt;
}
