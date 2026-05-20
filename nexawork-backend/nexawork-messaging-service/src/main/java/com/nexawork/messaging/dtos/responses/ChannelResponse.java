package com.nexawork.messaging.dtos.responses;

import com.nexawork.messaging.entities.enums.ChannelType;

import java.time.LocalDateTime;

public record ChannelResponse(
    Long id,
    String name,
    ChannelType channelType,
    Long organisationId,
    Long projectId,
    Long createdByUserId,
    LocalDateTime createdAt
) {}
