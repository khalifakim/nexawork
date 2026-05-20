package com.nexawork.messaging.dtos.requests;

import com.nexawork.messaging.entities.enums.ChannelType;
import jakarta.validation.constraints.NotBlank;

public record CreateChannelRequest(
    @NotBlank String name,
    ChannelType channelType,
    Long projectId
) {}
