package com.nexawork.messaging.dtos.responses;

import java.time.LocalDateTime;

public record MessageResponse(
    Long id,
    Long channelId,
    Long conversationId,
    Long senderUserId,
    String content,
    String attachmentUrl,
    String attachmentName,
    String messageType,
    LocalDateTime sentAt,
    Boolean edited
) {}
