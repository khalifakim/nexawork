package com.nexawork.meeting.dtos.responses;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Message du chat d'une réunion (M2, §14.3).
 */
@Data
@Builder
public class MeetingMessageResponse {

    private UUID id;
    private UUID callId;
    private UUID authorId;
    private String authorName;
    private String content;
    private LocalDateTime sentAt;
}
