package com.nexawork.ged.entities;

import com.nexawork.ged.entities.enums.ShareMode;
import com.nexawork.ged.entities.enums.TargetType;
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
 * Lien de partage externe (Brique 4) — accès à un élément GED SANS compte.
 *
 * <p>La sécurité ne repose PAS sur une authentification (il n'y en a pas), mais sur
 * la combinaison : token opaque imprévisible + expiration (date et/ou nombre
 * d'accès) + mot de passe optionnel (haché) + révocation + portée limitée au seul
 * élément ciblé. Toute la validation est faite côté serveur.</p>
 */
@Entity
@Table(name = "ged_shared_links")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SharedLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Token opaque URL-safe — seul secret qui donne accès au lien. */
    @Column(name = "token", nullable = false, unique = true, length = 64)
    private String token;

    /** Workspace propriétaire de l'élément (borne le relais d'octets vers le File Service). */
    @Column(name = "organisation_id", nullable = false)
    private UUID organisationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 10)
    private TargetType targetType;

    /** Id du fichier OU du dossier ciblé, selon {@link #targetType}. */
    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", nullable = false, length = 10)
    private ShareMode mode;

    /** Hash BCrypt du mot de passe optionnel (null = pas de mot de passe). */
    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    /** Expiration par date (null = pas de limite de date). */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    /** Expiration par nombre d'accès (null = illimité ; 1 = usage unique). */
    @Column(name = "max_access")
    private Integer maxAccess;

    @Column(name = "access_count", nullable = false)
    private Integer accessCount;

    /** Taille max par fichier déposé (mode DROP ; null = défaut serveur). */
    @Column(name = "max_upload_bytes")
    private Long maxUploadBytes;

    /** Extensions autorisées au dépôt (CSV, ex. « pdf,png,docx » ; null = défaut). */
    @Column(name = "allowed_extensions", length = 255)
    private String allowedExtensions;

    @Column(name = "created_by_user_id", nullable = false)
    private UUID createdByUserId;

    @Column(name = "revoked", nullable = false)
    private Boolean revoked;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
