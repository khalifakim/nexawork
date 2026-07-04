package com.nexawork.auth.entities;

import com.nexawork.commons.audits.Auditable;
import com.nexawork.auth.entities.enums.ActionTokenType;
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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Token d'action à usage unique envoyé par email : vérification d'adresse
 * (§3.5) et réinitialisation de mot de passe (§3.4). Complément V5.1 §4.1
 * requis par les endpoints §13.1 (password/reset-request, password/reset).
 */
@Entity
@Table(name = "user_action_tokens")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class UserActionToken extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "token", nullable = false, unique = true, length = 512)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private ActionTokenType type;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /**
     * Renseigné à l'utilisation — un token consommé n'est jamais réutilisable.
     */
    @Column(name = "used_at")
    private LocalDateTime usedAt;
}
