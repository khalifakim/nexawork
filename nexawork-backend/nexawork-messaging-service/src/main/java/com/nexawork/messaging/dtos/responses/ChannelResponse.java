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
    private LocalDateTime createdAt;
}
