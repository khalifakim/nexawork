package com.nexawork.messaging.dtos.responses;

import com.nexawork.messaging.entities.enums.ChannelIcon;
import com.nexawork.messaging.entities.enums.ChannelType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Canal (§13.5, §12). {@code canWrite} indique si l'appelant peut écrire
 * (composer monté côté frontend — REF D).
 */
@Data
@Builder
public class ChannelResponse {

    private UUID id;
    private String name;
    private ChannelIcon icon;
    private ChannelType channelType;
    private UUID organisationId;
    private UUID projectId;
    private UUID createdByUserId;
    private Boolean isSystem;
    private Boolean readonly;
    private Boolean isPrivate;
    private Boolean canWrite;
    /**
     * Nombre de membres ayant accès au canal : bénéficiaires explicites si le canal
     * est privé, sinon tous les membres du workspace (canal ouvert).
     */
    private Integer memberCount;
    /** Date du dernier message (dernière activité) — null si le canal est vide. */
    private LocalDateTime lastActivityAt;
    /** Nombre de messages non lus pour l'appelant (badge, parité conversations). */
    private Long unreadCount;
    /** Dernière lecture du canal par l'appelant — sépare « lus / non lus » côté vue. */
    private LocalDateTime lastReadAt;
    private LocalDateTime createdAt;
}
