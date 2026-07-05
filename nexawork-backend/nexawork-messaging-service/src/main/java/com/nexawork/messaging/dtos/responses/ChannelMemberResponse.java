package com.nexawork.messaging.dtos.responses;

import com.nexawork.messaging.entities.enums.ChannelAccessLevel;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Membre autorisé d'un canal privé (§13.5).
 */
@Data
@Builder
public class ChannelMemberResponse {

    private UUID userId;
    private ChannelAccessLevel accessLevel;
    private LocalDateTime joinedAt;
}
