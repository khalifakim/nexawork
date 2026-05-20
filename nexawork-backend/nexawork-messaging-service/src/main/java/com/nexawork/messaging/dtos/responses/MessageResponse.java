package com.nexawork.messaging.dtos.responses;

import java.time.LocalDateTime;

public record MessageResponse(
    Long id,
    Long channelId,
    Long senderUserId,
    String content,
    String attachmentUrl,
    String attachmentName,
    LocalDateTime sentAt,
    Boolean edited
) {}
