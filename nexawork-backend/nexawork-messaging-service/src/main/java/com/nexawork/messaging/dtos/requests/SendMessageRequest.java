package com.nexawork.messaging.dtos.requests;

import jakarta.validation.constraints.NotBlank;

public record SendMessageRequest(
    @NotBlank String content,
    String attachmentUrl,
    String attachmentName
) {}
