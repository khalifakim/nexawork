package com.nexawork.meeting.dtos.requests;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

public record CreateCallRequest(
    @NotBlank String topic,
    Long projectId,
    LocalDateTime scheduledAt
) {}
