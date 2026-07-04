package com.nexawork.auth.entities;

import com.nexawork.commons.audits.Auditable;
import com.nexawork.auth.entities.enums.OrgRole;
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
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Jonction enrichie User ↔ Organisation : rôle d'accès + état d'appartenance
 * (V5.1 §4.1). UNIQUE(organisation_id, user_id).
 */
@Entity
@Table(name = "organisation_members",
        uniqueConstraints = @UniqueConstraint(name = "uk_organisation_members_org_user",
                columnNames = {"organisation_id", "user_id"}))
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class OrganisationMember extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organisation_id", nullable = false)
    private Organisation organisation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "org_role", nullable = false, length = 50)
    @lombok.Builder.Default
    private OrgRole orgRole = OrgRole.MEMBER;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    /**
     * Vrai pour le fondateur (Propriétaire) — REF C : intangible.
     */
    @Column(name = "is_owner", nullable = false)
    @lombok.Builder.Default
    private Boolean isOwner = Boolean.FALSE;

    @Column(name = "is_deactivated", nullable = false)
    @lombok.Builder.Default
    private Boolean isDeactivated = Boolean.FALSE;
}
