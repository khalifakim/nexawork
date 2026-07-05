package com.nexawork.messaging.entities;

import com.nexawork.messaging.entities.enums.ChannelIcon;
import com.nexawork.messaging.entities.enums.ChannelType;
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
 * Canal de discussion (V5.1 §4.5). GLOBAL_ORG (workspace) ou PROJECT.
 * {@code readonly} (REF D : écriture réservée ADMIN/CP) est indépendant de
 * {@code icon}. {@code isPrivate} restreint l'accès aux ChannelMember (REF F).
 * Le caractère « archivé » d'un canal projet est dérivé du statut du projet.
 */
@Entity
@Table(name = "channels")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Channel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "icon", nullable = false, length = 20)
    private ChannelIcon icon;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel_type", nullable = false, length = 50)
    private ChannelType channelType;

    @Column(name = "organisation_id", nullable = false)
    private UUID organisationId;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "created_by_user_id")
    private UUID createdByUserId;

    @Column(name = "is_system", nullable = false)
    private Boolean isSystem;

    /** Écriture réservée ADMIN + chef de projet (REF D). */
    @Column(name = "readonly", nullable = false)
    private Boolean readonly;

    @Column(name = "is_private", nullable = false)
    private Boolean isPrivate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
