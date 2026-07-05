package com.nexawork.ged.entities;

import com.nexawork.ged.entities.enums.AccessLevel;
import com.nexawork.ged.entities.enums.GranteeType;
import com.nexawork.ged.entities.enums.TargetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
 * Grant d'accès polymorphe cible→bénéficiaire (V5.1 §4.4). Évite quatre tables de
 * jonction ; intégrité vérifiée applicativement (pas de FK SQL vers la cible ni le
 * bénéficiaire). Un seul grant par (cible, bénéficiaire).
 */
@Entity
@Table(name = "ged_access_grants",
        uniqueConstraints = @UniqueConstraint(name = "uk_ged_grant_target_grantee",
                columnNames = {"target_type", "target_id", "grantee_type", "grantee_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GedAccessGrant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 10)
    private TargetType targetType;

    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "grantee_type", nullable = false, length = 10)
    private GranteeType granteeType;

    @Column(name = "grantee_id", nullable = false)
    private UUID granteeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_level", nullable = false, length = 10)
    private AccessLevel accessLevel;

    @Column(name = "granted_by", nullable = false)
    private UUID grantedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
