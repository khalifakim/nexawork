package com.nexawork.meeting.dtos.responses;

import com.nexawork.meeting.entities.enums.CallStatus;

import java.time.LocalDateTime;

public record CallResponse(
    Long id,
    String topic,
    String roomName,
    Long organisationId,
    Long projectId,
    Long hostUserId,
    CallStatus status,
    LocalDateTime scheduledAt,
    LocalDateTime startedAt,
    LocalDateTime createdAt,
    String jitsiToken,
    String jitsiUrl
) {}
