package com.nexawork.auth.entities;

import com.nexawork.commons.audits.Auditable;
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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Refresh token rotatif stocké en base (V5.1 §4.1, §E.5) : émis au login,
 * révoqué et remplacé à chaque renouvellement ; révocation ciblée pour R20.
 */
@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "token", nullable = false, unique = true, length = 512)
    private String token;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "revoked", nullable = false)
    @lombok.Builder.Default
    private Boolean revoked = Boolean.FALSE;

    /**
     * Workspace actif de la session portée par ce token (nullable tant que
     * l'utilisateur n'a pas ouvert de workspace) — nécessaire pour R20 :
     * révocation ciblée quand l'utilisateur quitte son workspace actif.
     */
    @Column(name = "active_organisation_id")
    private UUID activeOrganisationId;
}
