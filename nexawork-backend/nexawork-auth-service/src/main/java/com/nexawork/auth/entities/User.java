package com.nexawork.auth.entities;

import com.nexawork.commons.audits.Auditable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Utilisateur de la plateforme ; peut appartenir à plusieurs workspaces (V5.1 §4.1).
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class User extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "first_name", nullable = false, length = 120)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 120)
    private String lastName;

    @Column(name = "job_title")
    private String jobTitle;

    @Column(name = "photo_url", length = 1024)
    private String photoUrl;

    @Column(name = "is_active", nullable = false)
    @lombok.Builder.Default
    private Boolean isActive = Boolean.TRUE;

    @Column(name = "email_verified", nullable = false)
    @lombok.Builder.Default
    private Boolean emailVerified = Boolean.FALSE;

    /**
     * Nouvelle adresse en attente de vérification (POST /users/me/email §13.1) —
     * basculée sur `email` à la consommation du lien de vérification.
     */
    @Column(name = "pending_email")
    private String pendingEmail;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    /**
     * Dérivé côté serveur, non stocké (V5.1 §4.1).
     */
    @Transient
    public String getDisplayName() {
        return firstName + " " + lastName;
    }
}
